import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Volume2, VolumeX, RotateCcw } from "lucide-react";
import {
  AGE,
  CANDLES,
  DEFAULT_MUSIC_VOLUME,
  EXTINGUISH_MS,
  FLICKER_MS,
  HOLD_MS,
  NAME,
  SMOKE_MS,
} from "@/lib/birthday/config";
import {
  startBlowDetector,
  type BlowHandle,
  type MicStatus,
} from "@/lib/birthday/blow-detector";
import {
  getAudioContext,
  playBirthdayMusic,
  playWhoosh,
  unlockAudio,
  type MusicHandle,
} from "@/lib/birthday/music";
import {
  burstConfetti,
  drawStar,
  makeFloaters,
  stepFloaters,
  stepPieces,
  type ConfettiPiece,
  type Floater,
} from "@/lib/birthday/fx";

type Stage =
  | "intro"
  | "listening"
  | "extinguishing"
  | "reveal"
  | "celebrate"
  | "finale";

type CandleMode = "lit" | "wild" | "out";

const METER = ["▁", "▂", "▃", "▅", "▆", "▇"] as const;

export function BirthdayExperience() {
  const [stage, setStage] = useState<Stage>("intro");
  const [candleMode, setCandleMode] = useState<CandleMode>("lit");
  const [micStatus, setMicStatus] = useState<MicStatus>("idle");
  const [bars, setBars] = useState(0);
  const [feeling, setFeeling] = useState(false);
  const [revealStep, setRevealStep] = useState(0);
  const [volume, setVolume] = useState(DEFAULT_MUSIC_VOLUME);
  const [muted, setMuted] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [runId, setRunId] = useState(0);

  const audioRef = useRef<AudioContext | null>(null);
  const blowRef = useRef<BlowHandle | null>(null);
  const musicRef = useRef<MusicHandle | null>(null);
  const blownRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fxLive, setFxLive] = useState(false);

  const stopMic = useCallback(() => {
    blowRef.current?.stop();
    blowRef.current = null;
  }, []);

  const stopMusic = useCallback(() => {
    musicRef.current?.stop();
    musicRef.current = null;
    setMusicOn(false);
  }, []);

  const beginExtinguish = useCallback(() => {
    if (blownRef.current) return;
    blownRef.current = true;
    stopMic();
    setFeeling(false);
    setStage("extinguishing");
    setCandleMode("wild");

    window.setTimeout(() => {
      setCandleMode("out");
      const ctx = audioRef.current;
      if (ctx) playWhoosh(ctx, muted ? 0 : volume);
    }, FLICKER_MS);
    window.setTimeout(() => {
      const audio = audioRef.current;
      if (audio) {
        void audio.resume();
        musicRef.current = playBirthdayMusic(audio, muted ? 0 : volume);
        setMusicOn(true);
      }
    }, FLICKER_MS + 240);
    window.setTimeout(() => {
      setStage("reveal");
      setFxLive(true);
    }, FLICKER_MS + EXTINGUISH_MS + SMOKE_MS + HOLD_MS);
  }, [muted, stopMic, volume]);

  const requestMic = useCallback(async () => {
    if (stage !== "intro") return;
    setStage("listening");
    setMicStatus("requesting");

    try {
      if (!audioRef.current) audioRef.current = getAudioContext();
      await unlockAudio(audioRef.current);
      const handle = await startBlowDetector(audioRef.current, {
        onStatus: setMicStatus,
        onLevel: (_rms, nextBars) => setBars(nextBars),
        onFeeling: setFeeling,
        onBlow: () => beginExtinguish(),
      });
      blowRef.current = handle;
    } catch {
      /* status already set by detector */
    }
  }, [beginExtinguish, stage]);

  useEffect(() => {
    if (stage !== "reveal") return;
    const timers = [
      window.setTimeout(() => setRevealStep(1), 280),
      window.setTimeout(() => setRevealStep(2), 1100),
      window.setTimeout(() => setRevealStep(3), 1900),
      window.setTimeout(() => {
        setStage("celebrate");
        setRevealStep(4);
      }, 3200),
      window.setTimeout(() => setRevealStep(5), 4600),
      window.setTimeout(() => setRevealStep(6), 6000),
      window.setTimeout(() => setRevealStep(7), 7600),
      window.setTimeout(() => {
        setStage("finale");
        setRevealStep(8);
      }, 9800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [stage, runId]);

  useEffect(() => {
    musicRef.current?.setVolume(volume);
    musicRef.current?.setMuted(muted);
  }, [volume, muted]);

  useEffect(() => {
    return () => {
      stopMic();
      stopMusic();
      if (audioRef.current && audioRef.current.state !== "closed") {
        void audioRef.current.close();
      }
    };
  }, [stopMic, stopMusic]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let pieces: ConfettiPiece[] = [];
    let floaters: Floater[] = [];
    let raf = 0;
    let last = performance.now();
    pieces = burstConfetti(window.innerWidth, window.innerHeight);
    floaters = makeFloaters(window.innerWidth, window.innerHeight);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);

      stepPieces(pieces, h, dt);
      stepFloaters(floaters, w, h, now);

      for (const p of pieces) {
        if (p.life <= 0) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, Math.max(0.15, p.life / 3));
        ctx.fillStyle = p.color;
        if (p.shape === "rect") {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.w * 0.45, 0, Math.PI * 2);
          ctx.fill();
        } else {
          drawStar(ctx, p.w * 0.55);
          ctx.fill();
        }
        ctx.restore();
      }

      for (const f of floaters) {
        ctx.save();
        const sway = Math.sin(now * 0.0018 + f.phase) * f.sway;
        ctx.translate(f.x + sway * 0.04, f.y);
        ctx.rotate(f.rot);
        if (f.kind === "balloon") {
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, f.size * 0.42, f.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.strokeStyle = "rgba(244,234,216,0.45)";
          ctx.lineWidth = 0.8;
          ctx.moveTo(0, f.size * 0.55);
          ctx.quadraticCurveTo(6, f.size * 0.9, 0, f.size * 1.35);
          ctx.stroke();
        } else if (f.kind === "sixteen") {
          ctx.font = `600 ${f.size}px "Cormorant Garamond", serif`;
          ctx.fillStyle = f.color;
          ctx.textAlign = "center";
          ctx.fillText(String(AGE), 0, 0);
        } else {
          ctx.fillStyle = f.color;
          ctx.globalAlpha = 0.55 + Math.sin(now * 0.004 + f.phase) * 0.35;
          ctx.beginPath();
          ctx.arc(0, 0, f.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [fxLive, runId]);

  const replay = () => {
    stopMic();
    stopMusic();
    blownRef.current = false;
    setFxLive(false);
    setCandleMode("lit");
    setMicStatus("idle");
    setBars(0);
    setFeeling(false);
    setRevealStep(0);
    setMuted(false);
    setVolume(DEFAULT_MUSIC_VOLUME);
    setStage("intro");
    setRunId((n) => n + 1);
  };

  const showCake = stage === "intro" || stage === "listening" || stage === "extinguishing";
  const micReady = micStatus === "ready" || micStatus === "calibrating";
  const micFailed = micStatus === "denied" || micStatus === "unavailable";
  const celebrating = stage === "reveal" || stage === "celebrate" || stage === "finale";

  return (
    <main className={`scene scene-${stage}`} data-run={runId}>
      <div className="room" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className="bokeh" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className={`orb orb-${i}`} />
        ))}
      </div>
      {fxLive ? <canvas ref={canvasRef} className="fx-canvas" aria-hidden="true" /> : null}

      <header className={`greeting ${showCake ? "is-on" : "is-off"}`}>
        <p className="line line-a">Hey {NAME}! 🎂</p>
        <p className="line line-b">I made something for you…</p>
        {stage === "intro" ? (
          <p className="line line-c">Blow out the candles.</p>
        ) : null}
      </header>

      <section className={`cake-wrap ${showCake ? "is-on" : "is-leaving"} ${candleMode === "out" ? "is-dark" : ""}`}>
        <div className="cake-glow" />
        <div className="cake-stage">
          <img src="/cake.jpg" alt={`Birthday cake for ${NAME}`} className="cake-photo" />
          <div className="candle-layer" aria-hidden="true">
            {CANDLES.map((c, i) => (
              <span
                key={`${runId}-${i}`}
                className={`candle candle-${candleMode}`}
                style={{
                  left: `${c.x}%`,
                  top: `${c.y}%`,
                  zIndex: Math.round(c.y),
                  "--h": `${c.h}px`,
                  "--tilt": `${c.tilt}deg`,
                  "--delay": `${c.delay}s`,
                } as React.CSSProperties}
              >
                <span className="stick" />
                <span className="wick" />
                <span className="flame">
                  <span className="flame-outer" />
                  <span className="flame-inner" />
                </span>
                <span className="smoke">
                  <i />
                  <i />
                  <i />
                </span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {stage === "intro" ? (
        <button type="button" className="begin" onClick={() => void requestMic()}>
          Tap to begin
        </button>
      ) : null}

      {stage === "listening" ? (
        <div className="mic-dock">
          <div className="mic-icon" data-live={micReady ? "1" : "0"}>
            <Mic size={16} strokeWidth={1.75} />
          </div>
          {micStatus === "requesting" ? <p className="mic-copy">Allow the microphone…</p> : null}
          {micStatus === "calibrating" ? <p className="mic-copy">Listening to the room…</p> : null}
          {micReady ? (
            <>
              <p className="mic-ready">Microphone ready</p>
              <p className="mic-meter" aria-live="polite">
                MIC&nbsp;&nbsp;
                {METER.map((ch, i) => (
                  <span key={ch} className={i <= bars ? "on" : ""}>
                    {ch}
                  </span>
                ))}
              </p>
              <p className="mic-copy">{feeling ? "I felt that! 💨" : "Blow toward your microphone 💨"}</p>
            </>
          ) : null}
          {micFailed ? (
            <div className="fallback">
              <p className="mic-copy">Can't access your microphone?</p>
              <button type="button" className="fallback-btn" onClick={beginExtinguish}>
                Blow them out manually 🎂
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={`veil ${celebrating ? "is-on" : ""}`} />

      {celebrating ? (
        <section className="reveal" aria-live="polite">
          {revealStep >= 1 && revealStep < 4 ? <p className="reveal-kicker">Happy Birthday</p> : null}
          {revealStep >= 2 && revealStep < 4 ? <h1 className="reveal-name">{NAME}!</h1> : null}
          {revealStep >= 3 ? <p className="reveal-age">{AGE}</p> : null}
          {revealStep === 4 ? <p className="msg msg-a">Happy 16th Birthday, {NAME}! 🥳</p> : null}
          {revealStep === 5 ? <p className="msg msg-b">You finally reached 16!</p> : null}
          {revealStep === 6 ? <p className="msg msg-c">Welcome to Level 16. 🎮🎂</p> : null}
          {revealStep === 7 ? (
            <p className="letter">
              16 years unlocked.
              <br />
              Here's to a year full of great memories, crazy moments, and new adventures.
            </p>
          ) : null}
          {revealStep >= 8 ? (
            <div className="finale-block">
              <p className="finale-line">16 looks good on you, {NAME}! 🎉</p>
              <button type="button" className="replay" onClick={replay}>
                <RotateCcw size={16} strokeWidth={2} />
                Replay the Surprise
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {musicOn ? (
        <div className="music-dock">
          <button
            type="button"
            className="mute"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute music" : "Mute music"}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            <span>Music</span>
          </button>
          <input
            className="vol"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            aria-label="Volume"
            onChange={(e) => {
              const next = Number(e.target.value);
              setVolume(next);
              if (next > 0 && muted) setMuted(false);
            }}
          />
        </div>
      ) : null}
    </main>
  );
}
