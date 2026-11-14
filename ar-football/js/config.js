// Game constants, difficulty presets and persisted settings.

export const PITCH = {
  halfWidth: 24,      // playable half-width (m), touchlines at ±halfWidth
  startZ: 8,          // kick-off point of every attack
  backZ: 16,          // back boundary (behind the attacker's start)
  goalZ: -50,         // goal line (attacker runs toward -z)
  goalHalfWidth: 3.66,
  goalHeight: 2.44,
  boxDepth: 16.5,
};

export const ATTACKER = {
  maxSpeed: 6.6,        // m/s sprint without the ball
  dribbleSpeed: 5.6,    // m/s sprint while dribbling
  lateralSpeed: 4.7,    // m/s full side-step
  backSpeed: 2.2,       // m/s retreat (step back)
  accel: 16,            // m/s²
  bodyRadius: 0.38,
  controlRadius: 1.45,  // ball must be inside this to touch it
  looseRadius: 3.6,     // beyond this the ball is loose
};

// Each preset tunes the defender brain (see js/ai.js for how each value is used).
export const DIFFICULTY = {
  easy: {
    label: 'سهل', speed: 4.6, accel: 9, reaction: 0.55, predict: 0.0,
    tackleRange: 1.9, tackleSuccess: 0.5, tackleCooldown: 2.2, aggression: 0.6,
    coop: 0.0, laneBlock: 0.0, engageRange: 11, readFeint: 0.05, foolTime: 1.2, gkReflex: 0.5,
  },
  medium: {
    label: 'متوسط', speed: 5.6, accel: 13, reaction: 0.25, predict: 0.5,
    tackleRange: 2.1, tackleSuccess: 0.68, tackleCooldown: 1.5, aggression: 0.8,
    coop: 0.5, laneBlock: 0.55, engageRange: 16, readFeint: 0.3, foolTime: 0.8, gkReflex: 0.7,
  },
  hard: {
    label: 'صعب', speed: 6.4, accel: 18, reaction: 0.14, predict: 0.85,
    tackleRange: 2.4, tackleSuccess: 0.82, tackleCooldown: 1.1, aggression: 1.0,
    coop: 1.0, laneBlock: 1.0, engageRange: 24, readFeint: 0.5, foolTime: 0.5, gkReflex: 0.85,
  },
};

const DEFAULTS = {
  difficulty: 'medium',
  defenders: 3,
  speedMul: 1.0,
  roundSec: 120,
  sensitivity: 1.0,
  showCam: true,
  arMode: false,
  sound: true,
  goalkeeper: true,
};

const KEY = 'arfd.settings.v1';

export function loadSettings() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { s = {}; }
  const out = { ...DEFAULTS, ...s };
  if (!DIFFICULTY[out.difficulty]) out.difficulty = DEFAULTS.difficulty;
  out.defenders = clampInt(out.defenders, 1, 5);
  return out;
}

export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}

export function loadBest() {
  try { return JSON.parse(localStorage.getItem('arfd.best.v1') || '{}') || {}; } catch { return {}; }
}
export function saveBest(b) {
  try { localStorage.setItem('arfd.best.v1', JSON.stringify(b)); } catch { /* ignore */ }
}

function clampInt(v, a, b) { v = Math.round(Number(v) || a); return Math.max(a, Math.min(b, v)); }
