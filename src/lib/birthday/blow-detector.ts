import {
  ANALYSER_SMOOTHING,
  BLOW_THRESHOLD_MULTIPLIER,
  FFT_SIZE,
  HIGH_BAND_RATIO_MIN,
  MIN_ABSOLUTE_RMS,
  MIN_BLOW_DURATION_MS,
  NOISE_CALIBRATION_TIME_MS,
} from "./config";

export type MicStatus = "idle" | "requesting" | "calibrating" | "ready" | "denied" | "unavailable";

export type BlowCallbacks = {
  onStatus: (status: MicStatus) => void;
  onLevel: (rms: number, bars: number, crossing: boolean) => void;
  onFeeling: (feeling: boolean) => void;
  onBlow: () => void;
};

export type BlowHandle = {
  stop: () => void;
};

function rmsFromTime(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

function highBandRatio(freq: Uint8Array, sampleRate: number, fftSize: number): number {
  const binHz = sampleRate / fftSize;
  let low = 0;
  let high = 0;
  for (let i = 1; i < freq.length; i++) {
    const hz = i * binHz;
    const mag = freq[i] / 255;
    const energy = mag * mag;
    if (hz < 400) low += energy;
    else if (hz < 7500) high += energy;
  }
  const total = low + high;
  if (total <= 1e-12) return 0;
  return high / total;
}

function barsFromRms(rms: number, baseline: number, threshold: number): number {
  const floor = Math.max(baseline * 0.6, 0.002);
  const span = Math.max(threshold * 1.6 - floor, 0.02);
  const t = Math.min(1, Math.max(0, (rms - floor) / span));
  return Math.round(t * 5);
}

export async function startBlowDetector(
  audioContext: AudioContext,
  callbacks: BlowCallbacks,
): Promise<BlowHandle> {
  callbacks.onStatus("requesting");

  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    callbacks.onStatus("unavailable");
    throw new Error("Microphone API unavailable");
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
  } catch {
    callbacks.onStatus("denied");
    throw new Error("Microphone permission denied");
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  analyser.smoothingTimeConstant = ANALYSER_SMOOTHING;
  analyser.minDecibels = -90;
  analyser.maxDecibels = -25;
  source.connect(analyser);

  const timeBuf = new Float32Array(analyser.fftSize);
  const freqBuf = new Uint8Array(analyser.frequencyBinCount);

  let stopped = false;
  let raf = 0;
  let baseline = 0.008;
  let threshold = Math.max(baseline * BLOW_THRESHOLD_MULTIPLIER, MIN_ABSOLUTE_RMS);
  let blowStartedAt: number | null = null;
  let feeling = false;
  let fired = false;
  const startedAt = performance.now();
  let readySent = false;

  callbacks.onStatus("calibrating");

  const samples: number[] = [];

  const tick = () => {
    if (stopped || fired) return;
    raf = requestAnimationFrame(tick);

    analyser.getFloatTimeDomainData(timeBuf);
    analyser.getByteFrequencyData(freqBuf);
    const rms = rmsFromTime(timeBuf);
    const now = performance.now();
    const elapsed = now - startedAt;

    if (elapsed < NOISE_CALIBRATION_TIME_MS) {
      samples.push(rms);
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      baseline = Math.max(avg, 0.003);
      threshold = Math.max(baseline * BLOW_THRESHOLD_MULTIPLIER, MIN_ABSOLUTE_RMS);
      callbacks.onLevel(rms, barsFromRms(rms, baseline, threshold), false);
      return;
    }

    if (!readySent) {
      readySent = true;
      callbacks.onStatus("ready");
    }

    const ratio = highBandRatio(freqBuf, audioContext.sampleRate, analyser.fftSize);
    const loud = rms >= threshold;
    const blowLike = ratio >= HIGH_BAND_RATIO_MIN;
    const crossing = loud && blowLike;

    callbacks.onLevel(rms, barsFromRms(rms, baseline, threshold), crossing);

    if (crossing) {
      if (blowStartedAt == null) blowStartedAt = now;
      if (!feeling) {
        feeling = true;
        callbacks.onFeeling(true);
      }
      if (now - blowStartedAt >= MIN_BLOW_DURATION_MS) {
        fired = true;
        callbacks.onBlow();
        return;
      }
    } else {
      blowStartedAt = null;
      if (feeling) {
        feeling = false;
        callbacks.onFeeling(false);
      }
    }
  };

  raf = requestAnimationFrame(tick);

  return {
    stop: () => {
      stopped = true;
      cancelAnimationFrame(raf);
      try {
        analyser.disconnect();
        source.disconnect();
      } catch {
        /* already disconnected */
      }
      for (const track of stream.getTracks()) track.stop();
    },
  };
}
