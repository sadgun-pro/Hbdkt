/** Tunable blow-detection values — adjust here, not throughout the app. */
export const BLOW_THRESHOLD_MULTIPLIER = 3.6;
export const MIN_BLOW_DURATION_MS = 460;
export const NOISE_CALIBRATION_TIME_MS = 1000;
export const MIN_ABSOLUTE_RMS = 0.036;
export const HIGH_BAND_RATIO_MIN = 0.42;
export const FFT_SIZE = 2048;
export const ANALYSER_SMOOTHING = 0.42;

export const FLICKER_MS = 320;
export const EXTINGUISH_MS = 520;
export const SMOKE_MS = 900;
export const HOLD_MS = 1000;
export const TRANSITION_MS = 900;

export const DEFAULT_MUSIC_VOLUME = 0.78;

export const NAME = "Karthik";
export const AGE = 16;

/** Sixteen candles, scattered like a baker placed them — not a grid. */
export const CANDLES = [
  { x: 33.0, y: 10.2, h: 46, tilt: -4, delay: 0.05 },
  { x: 43.5, y: 8.0, h: 50, tilt: 3, delay: 0.38 },
  { x: 53.5, y: 7.6, h: 44, tilt: -2, delay: 0.12 },
  { x: 63.2, y: 9.0, h: 48, tilt: 5, delay: 0.55 },
  { x: 72.0, y: 11.8, h: 40, tilt: -3, delay: 0.22 },
  { x: 28.5, y: 14.4, h: 42, tilt: 4, delay: 0.7 },
  { x: 38.2, y: 12.6, h: 54, tilt: -5, delay: 0.18 },
  { x: 48.4, y: 11.4, h: 47, tilt: 1, delay: 0.44 },
  { x: 58.6, y: 12.8, h: 52, tilt: -2, delay: 0.08 },
  { x: 67.8, y: 15.2, h: 43, tilt: 6, delay: 0.62 },
  { x: 34.6, y: 18.0, h: 36, tilt: -1, delay: 0.3 },
  { x: 44.0, y: 16.6, h: 49, tilt: 3, delay: 0.5 },
  { x: 54.2, y: 16.2, h: 41, tilt: -4, delay: 0.15 },
  { x: 63.4, y: 18.4, h: 38, tilt: 2, delay: 0.78 },
  { x: 41.5, y: 20.6, h: 34, tilt: 2, delay: 0.26 },
  { x: 51.8, y: 20.2, h: 40, tilt: -3, delay: 0.4 },
] as const;
