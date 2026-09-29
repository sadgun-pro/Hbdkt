import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Mic, i as RotateCcw, n as Volume2, t as VolumeX } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-KfyBb8S_.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/** Tunable blow-detection values — adjust here, not throughout the app. */
var BLOW_THRESHOLD_MULTIPLIER = 3.6;
var MIN_ABSOLUTE_RMS = .036;
var FFT_SIZE = 2048;
var ANALYSER_SMOOTHING = .42;
var HOLD_MS = 1e3;
var DEFAULT_MUSIC_VOLUME = .78;
var NAME = "Karthik";
/** Sixteen candles, scattered like a baker placed them — not a grid. */
var CANDLES = [
	{
		x: 27.5,
		y: 29.5,
		h: 52,
		tilt: -4,
		delay: .05
	},
	{
		x: 36.2,
		y: 23.8,
		h: 47,
		tilt: 3,
		delay: .38
	},
	{
		x: 45,
		y: 20.4,
		h: 56,
		tilt: -2,
		delay: .12
	},
	{
		x: 53.8,
		y: 19.6,
		h: 49,
		tilt: 5,
		delay: .55
	},
	{
		x: 62.4,
		y: 22.2,
		h: 54,
		tilt: -3,
		delay: .22
	},
	{
		x: 70.8,
		y: 27.4,
		h: 44,
		tilt: 2,
		delay: .7
	},
	{
		x: 23.6,
		y: 36.8,
		h: 41,
		tilt: 4,
		delay: .18
	},
	{
		x: 33.4,
		y: 33,
		h: 58,
		tilt: -5,
		delay: .44
	},
	{
		x: 43.6,
		y: 28.6,
		h: 46,
		tilt: 1,
		delay: .08
	},
	{
		x: 54.6,
		y: 27.2,
		h: 61,
		tilt: -2,
		delay: .62
	},
	{
		x: 64.8,
		y: 31.5,
		h: 48,
		tilt: 6,
		delay: .3
	},
	{
		x: 31,
		y: 40.6,
		h: 39,
		tilt: -1,
		delay: .5
	},
	{
		x: 42.2,
		y: 36.4,
		h: 53,
		tilt: 3,
		delay: .15
	},
	{
		x: 53,
		y: 34.8,
		h: 43,
		tilt: -4,
		delay: .78
	},
	{
		x: 40.4,
		y: 42.8,
		h: 37,
		tilt: 2,
		delay: .26
	},
	{
		x: 51.2,
		y: 41.2,
		h: 45,
		tilt: -3,
		delay: .4
	}
];
function rmsFromTime(buf) {
	let sum = 0;
	for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
	return Math.sqrt(sum / buf.length);
}
function highBandRatio(freq, sampleRate, fftSize) {
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
function barsFromRms(rms, baseline, threshold) {
	const floor = Math.max(baseline * .6, .002);
	const span = Math.max(threshold * 1.6 - floor, .02);
	const t = Math.min(1, Math.max(0, (rms - floor) / span));
	return Math.round(t * 5);
}
async function startBlowDetector(audioContext, callbacks) {
	callbacks.onStatus("requesting");
	if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
		callbacks.onStatus("unavailable");
		throw new Error("Microphone API unavailable");
	}
	let stream;
	try {
		stream = await navigator.mediaDevices.getUserMedia({ audio: {
			echoCancellation: false,
			noiseSuppression: false,
			autoGainControl: false
		} });
	} catch {
		callbacks.onStatus("denied");
		throw new Error("Microphone permission denied");
	}
	if (audioContext.state === "suspended") await audioContext.resume();
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
	let baseline = .008;
	let threshold = Math.max(baseline * BLOW_THRESHOLD_MULTIPLIER, MIN_ABSOLUTE_RMS);
	let blowStartedAt = null;
	let feeling = false;
	let fired = false;
	const startedAt = performance.now();
	let readySent = false;
	callbacks.onStatus("calibrating");
	const samples = [];
	const tick = () => {
		if (stopped || fired) return;
		raf = requestAnimationFrame(tick);
		analyser.getFloatTimeDomainData(timeBuf);
		analyser.getByteFrequencyData(freqBuf);
		const rms = rmsFromTime(timeBuf);
		const now = performance.now();
		if (now - startedAt < 1e3) {
			samples.push(rms);
			const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
			baseline = Math.max(avg, .003);
			threshold = Math.max(baseline * BLOW_THRESHOLD_MULTIPLIER, MIN_ABSOLUTE_RMS);
			callbacks.onLevel(rms, barsFromRms(rms, baseline, threshold), false);
			return;
		}
		if (!readySent) {
			readySent = true;
			callbacks.onStatus("ready");
		}
		const ratio = highBandRatio(freqBuf, audioContext.sampleRate, analyser.fftSize);
		const crossing = rms >= threshold && ratio >= .42;
		callbacks.onLevel(rms, barsFromRms(rms, baseline, threshold), crossing);
		if (crossing) {
			if (blowStartedAt == null) blowStartedAt = now;
			if (!feeling) {
				feeling = true;
				callbacks.onFeeling(true);
			}
			if (now - blowStartedAt >= 460) {
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
	return { stop: () => {
		stopped = true;
		cancelAnimationFrame(raf);
		try {
			analyser.disconnect();
			source.disconnect();
		} catch {}
		for (const track of stream.getTracks()) track.stop();
	} };
}
var NOTE_INDEX = {
	C: 0,
	"C#": 1,
	Db: 1,
	D: 2,
	"D#": 3,
	Eb: 3,
	E: 4,
	F: 5,
	"F#": 6,
	Gb: 6,
	G: 7,
	"G#": 8,
	Ab: 8,
	A: 9,
	"A#": 10,
	Bb: 10,
	B: 11
};
function hz(name) {
	const match = name.match(/^([A-G][#b]?)(\d)$/);
	if (!match) return 440;
	const pc = NOTE_INDEX[match[1] ?? "A"] ?? 9;
	return 440 * 2 ** (((Number(match[2]) + 1) * 12 + pc - 69) / 12);
}
function n(name, start, dur, vel, kind) {
	return {
		freq: hz(name),
		start,
		dur,
		vel,
		kind
	};
}
/**
* A full celebratory arrangement (~22s): intro sparkle, two verses of
* Happy Birthday (public domain), a held cadence, and a little coda.
*/
function score() {
	const beat = .52;
	const notes = [];
	const verse = (t0, up = 0) => {
		const s = (name) => {
			if (!up) return name;
			const m = name.match(/^([A-G][#b]?)(\d)$/);
			if (!m) return name;
			return `${m[1]}${Number(m[2]) + up}`;
		};
		const line = [
			[
				s("C4"),
				0,
				.72,
				.9
			],
			[
				s("C4"),
				.72,
				.28,
				.72
			],
			[
				s("D4"),
				1,
				1,
				1
			],
			[
				s("C4"),
				2,
				1,
				.95
			],
			[
				s("F4"),
				3,
				1,
				1
			],
			[
				s("E4"),
				4,
				2,
				1
			],
			[
				s("C4"),
				6,
				.72,
				.9
			],
			[
				s("C4"),
				6.72,
				.28,
				.72
			],
			[
				s("D4"),
				7,
				1,
				1
			],
			[
				s("C4"),
				8,
				1,
				.95
			],
			[
				s("G4"),
				9,
				1,
				1
			],
			[
				s("F4"),
				10,
				2,
				1
			],
			[
				s("C4"),
				12,
				.72,
				.9
			],
			[
				s("C4"),
				12.72,
				.28,
				.72
			],
			[
				s("C5"),
				13,
				1,
				1
			],
			[
				s("A4"),
				14,
				1,
				.95
			],
			[
				s("F4"),
				15,
				1,
				.92
			],
			[
				s("E4"),
				16,
				1,
				.9
			],
			[
				s("D4"),
				17,
				1.4,
				.95
			],
			[
				s("Bb4"),
				18.5,
				.72,
				.88
			],
			[
				s("Bb4"),
				19.22,
				.28,
				.7
			],
			[
				s("A4"),
				19.5,
				1,
				.95
			],
			[
				s("F4"),
				20.5,
				1,
				.95
			],
			[
				s("G4"),
				21.5,
				1,
				1
			],
			[
				s("F4"),
				22.5,
				2.2,
				1
			]
		];
		for (const [name, st, dur, vel] of line) {
			notes.push(n(name, t0 + st * beat, dur * beat, vel, "lead"));
			const harm = name.replace(/(\d)$/, (_, o) => String(Number(o) - 1));
			notes.push(n(harm, t0 + st * beat, dur * beat, vel * .38, "harmony"));
		}
	};
	[
		"F3",
		"A3",
		"C4",
		"F4",
		"A4",
		"C5",
		"F5"
	].forEach((name, i) => {
		notes.push(n(name, i * .11, .55, .28, "spark"));
	});
	verse(.9, 0);
	verse(13.9, 0);
	const codaT = 26.9;
	[
		"F4",
		"A4",
		"C5",
		"F5"
	].forEach((name, i) => {
		notes.push(n(name, codaT + i * .16, 1.4, .55, "spark"));
	});
	notes.push(n("F3", codaT, 2.4, .55, "bass"));
	notes.push(n("C3", codaT, 2.4, .4, "bass"));
	notes.push(n("F4", 27.299999999999997, 2, .85, "lead"));
	for (let i = 0; i < 12; i++) {
		const t = .9 + i * 2 * beat;
		const root = i % 4 === 3 ? "C3" : "F3";
		notes.push(n(root, t, beat * 1.6, .42, "bass"));
	}
	return notes;
}
function envGain(ctx, dest, start, dur, peak) {
	const g = ctx.createGain();
	g.gain.setValueAtTime(1e-4, start);
	g.gain.exponentialRampToValueAtTime(Math.max(peak, 2e-4), start + Math.min(.03, dur * .2));
	const release = Math.min(.18, dur * .35);
	g.gain.setValueAtTime(Math.max(peak, 2e-4), start + dur - release);
	g.gain.exponentialRampToValueAtTime(1e-4, start + dur);
	g.connect(dest);
	return g;
}
function playBirthdayMusic(ctx, initialVolume = DEFAULT_MUSIC_VOLUME) {
	const master = ctx.createGain();
	master.gain.value = initialVolume;
	master.connect(ctx.destination);
	const live = [];
	let volume = initialVolume;
	let muted = false;
	let stopped = false;
	const apply = () => {
		const now = ctx.currentTime;
		master.gain.cancelScheduledValues(now);
		master.gain.setTargetAtTime(muted ? 1e-4 : volume, now, .03);
	};
	if (ctx.state === "suspended") ctx.resume();
	const t0 = ctx.currentTime + .05;
	const notes = score();
	for (const note of notes) {
		if (note.freq == null) continue;
		const start = t0 + note.start;
		const osc = ctx.createOscillator();
		osc.type = note.kind === "bass" ? "sine" : note.kind === "harmony" ? "triangle" : note.kind === "spark" ? "sine" : "triangle";
		osc.frequency.setValueAtTime(note.freq, start);
		const peak = note.kind === "lead" ? .22 * note.vel : note.kind === "bass" ? .2 * note.vel : note.kind === "spark" ? .1 * note.vel : .1 * note.vel;
		const g = envGain(ctx, master, start, note.dur, peak);
		osc.connect(g);
		osc.start(start);
		osc.stop(start + note.dur + .02);
		live.push(osc);
	}
	try {
		const frames = Math.floor(ctx.sampleRate * .28);
		const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
		const src = ctx.createBufferSource();
		src.buffer = buffer;
		const filter = ctx.createBiquadFilter();
		filter.type = "highpass";
		filter.frequency.value = 1800;
		const g = ctx.createGain();
		g.gain.value = .045;
		src.connect(filter);
		filter.connect(g);
		g.connect(master);
		src.start(t0 + .88);
		live.push(src);
	} catch {}
	return {
		setVolume: (v) => {
			volume = Math.min(1, Math.max(0, v));
			apply();
		},
		setMuted: (next) => {
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
				master.gain.setTargetAtTime(1e-4, now, .04);
			} catch {}
			for (const node of live) try {
				node.stop();
			} catch {}
			live.length = 0;
			window.setTimeout(() => {
				try {
					master.disconnect();
				} catch {}
			}, 120);
		}
	};
}
async function unlockAudio(ctx) {
	if (ctx.state === "suspended") await ctx.resume();
	const osc = ctx.createOscillator();
	const g = ctx.createGain();
	g.gain.value = 8e-5;
	osc.connect(g);
	g.connect(ctx.destination);
	osc.start();
	osc.stop(ctx.currentTime + .04);
}
function playWhoosh(ctx, volume) {
	const dur = .45;
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
	filter.Q.value = .7;
	const g = ctx.createGain();
	g.gain.setValueAtTime(1e-4, ctx.currentTime);
	g.gain.exponentialRampToValueAtTime(Math.max(.18 * volume, .04), ctx.currentTime + .04);
	g.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + dur);
	src.connect(filter);
	filter.connect(g);
	g.connect(ctx.destination);
	src.start();
	src.stop(ctx.currentTime + dur + .02);
}
function getAudioContext() {
	return new (window.AudioContext || window.webkitAudioContext)();
}
var PALETTE = [
	"#f4ead8",
	"#e8c17a",
	"#9a3040",
	"#c45c48",
	"#fff6e0",
	"#d4a054",
	"#7a1f2b"
];
function rand(min, max) {
	return min + Math.random() * (max - min);
}
function burstConfetti(w, h) {
	const pieces = [];
	const origins = [
		{
			x: w * .15,
			y: h * .2
		},
		{
			x: w * .5,
			y: h * .08
		},
		{
			x: w * .85,
			y: h * .2
		},
		{
			x: w * .3,
			y: h * .95
		},
		{
			x: w * .7,
			y: h * .95
		}
	];
	for (const o of origins) {
		const count = 38;
		for (let i = 0; i < count; i++) {
			const angle = rand(-Math.PI, 0);
			const speed = rand(3.2, 9.5);
			const shapeRoll = Math.random();
			pieces.push({
				x: o.x + rand(-12, 12),
				y: o.y,
				vx: Math.cos(angle) * speed * (o.x < w * .5 ? 1 : o.x > w * .5 ? -1 : Math.random() < .5 ? 1 : -1) * .35 + Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed - rand(1, 4),
				w: rand(4, 9),
				h: rand(6, 14),
				rot: rand(0, Math.PI * 2),
				vr: rand(-.18, .18),
				shape: shapeRoll < .55 ? "rect" : shapeRoll < .82 ? "circle" : "star",
				color: PALETTE[i % PALETTE.length] ?? "#e8c17a",
				life: rand(3.2, 5.4),
				gravity: rand(.06, .12)
			});
		}
	}
	return pieces;
}
function makeFloaters(w, h) {
	const items = [];
	const balloonColors = [
		"#9a3040",
		"#f4ead8",
		"#e8c17a",
		"#7a1f2b",
		"#fff1d4"
	];
	for (let i = 0; i < 7; i++) items.push({
		x: rand(w * .08, w * .92),
		y: h + rand(20, 180),
		vy: rand(.35, .7),
		size: rand(22, 38),
		rot: rand(-.15, .15),
		vr: rand(-.004, .004),
		kind: "balloon",
		color: balloonColors[i % balloonColors.length] ?? "#9a3040",
		sway: rand(10, 22),
		phase: rand(0, Math.PI * 2)
	});
	for (let i = 0; i < 6; i++) items.push({
		x: rand(w * .1, w * .9),
		y: h + rand(80, 320),
		vy: rand(.25, .5),
		size: rand(18, 28),
		rot: rand(-.2, .2),
		vr: rand(-.01, .01),
		kind: "sixteen",
		color: "rgba(232,193,122,0.55)",
		sway: rand(8, 18),
		phase: rand(0, Math.PI * 2)
	});
	for (let i = 0; i < 18; i++) items.push({
		x: rand(0, w),
		y: rand(0, h),
		vy: rand(.05, .18),
		size: rand(1.2, 2.6),
		rot: 0,
		vr: 0,
		kind: "spark",
		color: "rgba(255,246,224,0.9)",
		sway: rand(4, 12),
		phase: rand(0, Math.PI * 2)
	});
	return items;
}
function drawStar(ctx, r) {
	ctx.beginPath();
	for (let i = 0; i < 5; i++) {
		const a = i * 4 * Math.PI / 5 - Math.PI / 2;
		const x = Math.cos(a) * r;
		const y = Math.sin(a) * r;
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.closePath();
}
function stepPieces(pieces, h, dt) {
	for (const p of pieces) {
		p.vy += p.gravity * dt * 60;
		p.vx *= .995;
		p.x += p.vx * dt * 60;
		p.y += p.vy * dt * 60;
		p.rot += p.vr * dt * 60;
		p.life -= dt;
		if (p.y > h + 40) {
			p.y = -20;
			p.vy = rand(.4, 1.2);
			p.life = rand(2.5, 4);
		}
	}
}
function stepFloaters(items, w, h, t) {
	for (const f of items) {
		f.y -= f.vy;
		f.x += Math.sin(t * .0018 + f.phase) * .35;
		f.rot += f.vr;
		if (f.y < -80) {
			f.y = h + rand(40, 160);
			f.x = rand(w * .06, w * .94);
		}
	}
}
var METER = [
	"▁",
	"▂",
	"▃",
	"▅",
	"▆",
	"▇"
];
function BirthdayExperience() {
	const [stage, setStage] = (0, import_react.useState)("intro");
	const [candleMode, setCandleMode] = (0, import_react.useState)("lit");
	const [micStatus, setMicStatus] = (0, import_react.useState)("idle");
	const [bars, setBars] = (0, import_react.useState)(0);
	const [feeling, setFeeling] = (0, import_react.useState)(false);
	const [revealStep, setRevealStep] = (0, import_react.useState)(0);
	const [volume, setVolume] = (0, import_react.useState)(DEFAULT_MUSIC_VOLUME);
	const [muted, setMuted] = (0, import_react.useState)(false);
	const [musicOn, setMusicOn] = (0, import_react.useState)(false);
	const [runId, setRunId] = (0, import_react.useState)(0);
	const audioRef = (0, import_react.useRef)(null);
	const blowRef = (0, import_react.useRef)(null);
	const musicRef = (0, import_react.useRef)(null);
	const blownRef = (0, import_react.useRef)(false);
	const canvasRef = (0, import_react.useRef)(null);
	const fxOnRef = (0, import_react.useRef)(false);
	const stopMic = (0, import_react.useCallback)(() => {
		blowRef.current?.stop();
		blowRef.current = null;
	}, []);
	const stopMusic = (0, import_react.useCallback)(() => {
		musicRef.current?.stop();
		musicRef.current = null;
		setMusicOn(false);
	}, []);
	const beginExtinguish = (0, import_react.useCallback)(() => {
		if (blownRef.current) return;
		blownRef.current = true;
		stopMic();
		setFeeling(false);
		setStage("extinguishing");
		setCandleMode("wild");
		const ctx = audioRef.current;
		if (ctx) playWhoosh(ctx, muted ? 0 : volume);
		window.setTimeout(() => setCandleMode("out"), 320);
		window.setTimeout(() => {
			const audio = audioRef.current;
			if (audio) {
				audio.resume();
				musicRef.current = playBirthdayMusic(audio, muted ? 0 : volume);
				setMusicOn(true);
			}
		}, 560);
		window.setTimeout(() => {
			setStage("reveal");
			fxOnRef.current = true;
		}, 1740 + HOLD_MS);
	}, [
		muted,
		stopMic,
		volume
	]);
	const requestMic = (0, import_react.useCallback)(async () => {
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
				onBlow: () => beginExtinguish()
			});
			blowRef.current = handle;
		} catch {}
	}, [beginExtinguish, stage]);
	(0, import_react.useEffect)(() => {
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
			window.setTimeout(() => setRevealStep(6), 6e3),
			window.setTimeout(() => setRevealStep(7), 7600),
			window.setTimeout(() => {
				setStage("finale");
				setRevealStep(8);
			}, 9800)
		];
		return () => timers.forEach(clearTimeout);
	}, [stage, runId]);
	(0, import_react.useEffect)(() => {
		musicRef.current?.setVolume(volume);
		musicRef.current?.setMuted(muted);
	}, [volume, muted]);
	(0, import_react.useEffect)(() => {
		return () => {
			stopMic();
			stopMusic();
			if (audioRef.current && audioRef.current.state !== "closed") audioRef.current.close();
		};
	}, [stopMic, stopMusic]);
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		let pieces = [];
		let floaters = [];
		let raf = 0;
		let last = performance.now();
		let spawned = false;
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
		const loop = (now) => {
			raf = requestAnimationFrame(loop);
			const w = window.innerWidth;
			const h = window.innerHeight;
			const dt = Math.min(.033, (now - last) / 1e3);
			last = now;
			ctx.clearRect(0, 0, w, h);
			if (fxOnRef.current && !spawned) {
				pieces = burstConfetti(w, h);
				floaters = makeFloaters(w, h);
				spawned = true;
			}
			if (!spawned) return;
			stepPieces(pieces, h, dt);
			stepFloaters(floaters, w, h, now);
			for (const p of pieces) {
				if (p.life <= 0) continue;
				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.rotate(p.rot);
				ctx.globalAlpha = Math.min(1, Math.max(.15, p.life / 3));
				ctx.fillStyle = p.color;
				if (p.shape === "rect") ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
				else if (p.shape === "circle") {
					ctx.beginPath();
					ctx.arc(0, 0, p.w * .45, 0, Math.PI * 2);
					ctx.fill();
				} else {
					drawStar(ctx, p.w * .55);
					ctx.fill();
				}
				ctx.restore();
			}
			for (const f of floaters) {
				ctx.save();
				const sway = Math.sin(now * .0018 + f.phase) * f.sway;
				ctx.translate(f.x + sway * .04, f.y);
				ctx.rotate(f.rot);
				if (f.kind === "balloon") {
					ctx.fillStyle = f.color;
					ctx.beginPath();
					ctx.ellipse(0, 0, f.size * .42, f.size * .55, 0, 0, Math.PI * 2);
					ctx.fill();
					ctx.beginPath();
					ctx.strokeStyle = "rgba(244,234,216,0.45)";
					ctx.lineWidth = .8;
					ctx.moveTo(0, f.size * .55);
					ctx.quadraticCurveTo(6, f.size * .9, 0, f.size * 1.35);
					ctx.stroke();
				} else if (f.kind === "sixteen") {
					ctx.font = `600 ${f.size}px "Cormorant Garamond", serif`;
					ctx.fillStyle = f.color;
					ctx.textAlign = "center";
					ctx.fillText(String(16), 0, 0);
				} else {
					ctx.fillStyle = f.color;
					ctx.globalAlpha = .55 + Math.sin(now * .004 + f.phase) * .35;
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
	}, [runId]);
	const replay = () => {
		stopMic();
		stopMusic();
		blownRef.current = false;
		fxOnRef.current = false;
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: `scene scene-${stage}`,
		"data-run": runId,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "room",
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "vignette",
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "bokeh",
				"aria-hidden": "true",
				children: Array.from({ length: 9 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `orb orb-${i}` }, i))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
				ref: canvasRef,
				className: "fx-canvas",
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: `greeting ${showCake ? "is-on" : "is-off"}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "line line-a",
						children: [
							"Hey ",
							NAME,
							"! 🎂"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "line line-b",
						children: "I made something for you…"
					}),
					stage === "intro" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "line line-c",
						children: "Blow out the candles."
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: `cake-wrap ${showCake ? "is-on" : "is-leaving"} ${candleMode === "out" ? "is-dark" : ""}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cake-glow" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "cake-stage",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: "/cake.jpg",
						alt: `Birthday cake for ${NAME}`,
						className: "cake-photo"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "candle-layer",
						"aria-hidden": "true",
						children: CANDLES.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: `candle candle-${candleMode}`,
							style: {
								left: `${c.x}%`,
								top: `${c.y}%`,
								"--h": `${c.h}px`,
								"--tilt": `${c.tilt}deg`,
								"--delay": `${c.delay}s`
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "stick" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "wick" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flame",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "flame-outer" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "flame-inner" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "smoke",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
									]
								})
							]
						}, `${runId}-${i}`))
					})]
				})]
			}),
			stage === "intro" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "begin",
				onClick: () => void requestMic(),
				children: "Tap to begin"
			}) : null,
			stage === "listening" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mic-dock",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mic-icon",
						"data-live": micReady ? "1" : "0",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, {
							size: 16,
							strokeWidth: 1.75
						})
					}),
					micStatus === "requesting" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mic-copy",
						children: "Allow the microphone…"
					}) : null,
					micStatus === "calibrating" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mic-copy",
						children: "Listening to the room…"
					}) : null,
					micReady ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mic-ready",
							children: "Microphone ready"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mic-meter",
							"aria-live": "polite",
							children: ["MIC\xA0\xA0", METER.map((ch, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: i <= bars ? "on" : "",
								children: ch
							}, ch))]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mic-copy",
							children: feeling ? "I felt that! 💨" : "Blow toward your microphone 💨"
						})
					] }) : null,
					micFailed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "fallback",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mic-copy",
							children: "Can't access your microphone?"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "fallback-btn",
							onClick: beginExtinguish,
							children: "Blow them out manually 🎂"
						})]
					}) : null
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `veil ${celebrating ? "is-on" : ""}` }),
			celebrating ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "reveal",
				"aria-live": "polite",
				children: [
					revealStep >= 1 && revealStep < 4 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "reveal-kicker",
						children: "Happy Birthday"
					}) : null,
					revealStep >= 2 && revealStep < 4 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
						className: "reveal-name",
						children: [NAME, "!"]
					}) : null,
					revealStep >= 3 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "reveal-age",
						children: 16
					}) : null,
					revealStep === 4 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "msg msg-a",
						children: [
							"Happy 16th Birthday, ",
							NAME,
							"! 🥳"
						]
					}) : null,
					revealStep === 5 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "msg msg-b",
						children: "You finally reached 16!"
					}) : null,
					revealStep === 6 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "msg msg-c",
						children: "Welcome to Level 16. 🎮🎂"
					}) : null,
					revealStep === 7 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "letter",
						children: [
							"16 years unlocked.",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
							"Here's to a year full of great memories, crazy moments, and new adventures."
						]
					}) : null,
					revealStep >= 8 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "finale-block",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "finale-line",
							children: [
								"16 looks good on you, ",
								NAME,
								"! 🎉"
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "replay",
							onClick: replay,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, {
								size: 16,
								strokeWidth: 2
							}), "Replay the Surprise"]
						})]
					}) : null
				]
			}) : null,
			musicOn ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "music-dock",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "mute",
					onClick: () => setMuted((m) => !m),
					"aria-label": muted ? "Unmute music" : "Mute music",
					children: [muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { size: 15 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { size: 15 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Music" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: "vol",
					type: "range",
					min: 0,
					max: 1,
					step: .01,
					value: muted ? 0 : volume,
					"aria-label": "Volume",
					onChange: (e) => {
						const next = Number(e.target.value);
						setVolume(next);
						if (next > 0 && muted) setMuted(false);
					}
				})]
			}) : null
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BirthdayExperience, {});
}
//#endregion
export { Home as component };
