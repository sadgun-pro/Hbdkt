import { DEFAULT_MUSIC_VOLUME } from "./config";

type Note = {
  midi?: number;
  freq?: number;
  start: number;
  dur: number;
  vel: number;
  kind: "lead" | "harmony" | "bass" | "spark";
};

const NOTE_INDEX: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
  "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

function hz(name: string): number {
  const match = name.match(/^([A-G][#b]?)(\d)$/);
  if (!match) return 440;
  const pc = NOTE_INDEX[match[1] ?? "A"] ?? 9;
  const oct = Number(match[2]);
  const midi = (oct + 1) * 12 + pc;
  return 440 * 2 ** ((midi - 69) / 12);
}

function n(name: string, start: number, dur: number, vel: number, kind: Note["kind"]): Note {
  return { freq: hz(name), start, dur, vel, kind };
}

/**
 * A full celebratory arrangement (~22s): intro sparkle, two verses of
 * Happy Birthday (public domain), a held cadence, and a little coda.
 */
function score(): Note[] {
  const beat = 0.52;
  const notes: Note[] = [];

  const verse = (t0: number, up = 0) => {
    const s = (name: string) => {
      if (!up) return name;
      const m = name.match(/^([A-G][#b]?)(\d)$/);
      if (!m) return name;
      return `${m[1]}${Number(m[2]) + up}`;
    };
    const line: Array<[string, number, number, number]> = [
      [s("C4"), 0, 0.72, 0.9],
      [s("C4"), 0.72, 0.28, 0.72],
      [s("D4"), 1, 1, 1],
      [s("C4"), 2, 1, 0.95],
      [s("F4"), 3, 1, 1],
      [s("E4"), 4, 2, 1],
      [s("C4"), 6, 0.72, 0.9],
      [s("C4"), 6.72, 0.28, 0.72],
      [s("D4"), 7, 1, 1],
      [s("C4"), 8, 1, 0.95],
      [s("G4"), 9, 1, 1],
      [s("F4"), 10, 2, 1],
      [s("C4"), 12, 0.72, 0.9],
      [s("C4"), 12.72, 0.28, 0.72],
      [s("C5"), 13, 1, 1],
      [s("A4"), 14, 1, 0.95],
      [s("F4"), 15, 1, 0.92],
      [s("E4"), 16, 1, 0.9],
      [s("D4"), 17, 1.4, 0.95],
      [s("Bb4"), 18.5, 0.72, 0.88],
      [s("Bb4"), 19.22, 0.28, 0.7],
      [s("A4"), 19.5, 1, 0.95],
      [s("F4"), 20.5, 1, 0.95],
      [s("G4"), 21.5, 1, 1],
      [s("F4"), 22.5, 2.2, 1],
    ];
    for (const [name, st, dur, vel] of line) {
      notes.push(n(name, t0 + st * beat, dur * beat, vel, "lead"));
      const harm = name.replace(/(\d)$/, (_, o) => String(Number(o) - 1));
      notes.push(n(harm, t0 + st * beat, dur * beat, vel * 0.38, "harmony"));
    }
  };

  // Soft intro arpeggio
  const intro = ["F3", "A3", "C4", "F4", "A4", "C5", "F5"];
  intro.forEach((name, i) => {
    notes.push(n(name, i * 0.11, 0.55, 0.28, "spark"));
  });

  verse(0.9, 0);
  verse(0.9 + 25 * beat, 0);

  const codaT = 0.9 + 50 * beat;
  ["F4", "A4", "C5", "F5"].forEach((name, i) => {
    notes.push(n(name, codaT + i * 0.16, 1.4, 0.55, "spark"));
  });
  notes.push(n("F3", codaT, 2.4, 0.55, "bass"));
  notes.push(n("C3", codaT, 2.4, 0.4, "bass"));
  notes.push(n("F4", codaT + 0.4, 2.0, 0.85, "lead"));

  // Pedal bass on downbeats
  for (let i = 0; i < 12; i++) {
    const t = 0.9 + i * 2 * beat;
    const root = i % 4 === 3 ? "C3" : "F3";
    notes.push(n(root, t, beat * 1.6, 0.42, "bass"));
  }

  return notes;
}

export type MusicHandle = {
  setVolume: (v: number) => void;
  setMuted: (muted: boolean) => void;
  stop: () => void;
  getVolume: () => number;
};

function envGain(
  ctx: AudioContext,
  dest: AudioNode,
  start: number,
  dur: number,
  peak: number,
): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), start + Math.min(0.03, dur * 0.2));
  const release = Math.min(0.18, dur * 0.35);
  g.gain.setValueAtTime(Math.max(peak, 0.0002), start + dur - release);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  g.connect(dest);
  return g;
}

export function playBirthdayMusic(ctx: AudioContext, initialVolume = DEFAULT_MUSIC_VOLUME): MusicHandle {
  const master = ctx.createGain();
  master.gain.value = initialVolume;
  master.connect(ctx.destination);

  const live: Array<OscillatorNode | AudioBufferSourceNode> = [];
  let volume = initialVolume;
  let muted = false;
  let stopped = false;

  const apply = () => {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(muted ? 0.0001 : volume, now, 0.03);
  };

  if (ctx.state === "suspended") void ctx.resume();

  const t0 = ctx.currentTime + 0.05;
  const notes = score();

  for (const note of notes) {
    if (note.freq == null) continue;
    const start = t0 + note.start;
    const osc = ctx.createOscillator();
    osc.type = note.kind === "bass" ? "sine" : note.kind === "harmony" ? "triangle" : note.kind === "spark" ? "sine" : "triangle";
    osc.frequency.setValueAtTime(note.freq, start);
    const peak =
      note.kind === "lead" ? 0.22 * note.vel : note.kind === "bass" ? 0.2 * note.vel : note.kind === "spark" ? 0.1 * note.vel : 0.1 * note.vel;
    const g = envGain(ctx, master, start, note.dur, peak);
    osc.connect(g);
    osc.start(start);
    osc.stop(start + note.dur + 0.02);
    live.push(osc);
  }

  // Soft shimmer noise on the first downbeat — a little "party" air, not a beep.
  try {
    const dur = 0.28;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.value = 0.045;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0 + 0.88);
    live.push(src);
  } catch {
    /* ignore */
  }

  return {
    setVolume: (v: number) => {
      volume = Math.min(1, Math.max(0, v));
      apply();
    },
    setMuted: (next: boolean) => {
      muted = next;
      apply();
    },
    getVolume: () => volume,
    stop: () => {
      if (stopped) return;
      stopped = true;
      const now = ctx.currentTime;
      try {
        master.gain.cancelScheduledValues(now);
        master.gain.setTargetAtTime(0.0001, now, 0.04);
      } catch {
        /* ignore */
      }
      for (const node of live) {
        try {
          node.stop();
        } catch {
          /* already stopped */
        }
      }
      live.length = 0;
      window.setTimeout(() => {
        try {
          master.disconnect();
        } catch {
          /* ignore */
        }
      }, 120);
    },
  };
}

export async function unlockAudio(ctx: AudioContext): Promise<void> {
  if (ctx.state === "suspended") await ctx.resume();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  g.gain.value = 0.00008;
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.04);
}

export function playWhoosh(ctx: AudioContext, volume: number): void {
  const dur = 0.45;
  const frames = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(900, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + dur);
  filter.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(Math.max(0.18 * volume, 0.04), ctx.currentTime + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start();
  src.stop(ctx.currentTime + dur + 0.02);
}

export function getAudioContext(): AudioContext {
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new Ctor();
}
