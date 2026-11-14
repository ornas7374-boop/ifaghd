// Game constants, difficulty presets and persisted settings.

// Room-scale arena (metres, arena-local). The whole arena can be scaled down in AR (tabletop).
// The attacker runs toward -z; the mini goal sits on the -z end.
export const PITCH = {
  halfWidth: 3,
  startZ: 3.6,
  backZ: 4.5,
  goalZ: -4.5,
  goalHalfWidth: 1.1,
  goalHeight: 1.0,
  shootRange: 3.8,      // shots allowed when this close to the goal line
};

// Distance unit for the AI (1 = a full-size pitch metre; arena is ~0.42 of that).
export const AI_UNIT = 0.42;

export const ATTACKER = {
  maxSpeed: 2.8,
  dribbleSpeed: 2.5,
  lateralSpeed: 2.2,
  backSpeed: 1.0,
  accel: 8,
  bodyRadius: 0.3,
  controlRadius: 1.0,
  looseRadius: 2.2,
};

// Each preset tunes the defender brain (see js/ai.js for how each value is used).
export const DIFFICULTY = {
  easy: {
    label: 'سهل', speed: 1.95, accel: 4, reaction: 0.55, predict: 0.0,
    tackleRange: 0.85, tackleSuccess: 0.5, tackleCooldown: 2.2, aggression: 0.6,
    coop: 0.0, laneBlock: 0.0, engageRange: 4.5, readFeint: 0.05, foolTime: 1.2, gkReflex: 0.5,
  },
  medium: {
    label: 'متوسط', speed: 2.45, accel: 6, reaction: 0.25, predict: 0.5,
    tackleRange: 0.95, tackleSuccess: 0.68, tackleCooldown: 1.5, aggression: 0.8,
    coop: 0.5, laneBlock: 0.55, engageRange: 6.5, readFeint: 0.3, foolTime: 0.8, gkReflex: 0.7,
  },
  hard: {
    label: 'صعب', speed: 2.8, accel: 8.5, reaction: 0.14, predict: 0.85,
    tackleRange: 1.05, tackleSuccess: 0.82, tackleCooldown: 1.1, aggression: 1.0,
    coop: 1.0, laneBlock: 1.0, engageRange: 10, readFeint: 0.5, foolTime: 0.5, gkReflex: 0.85,
  },
};

const DEFAULTS = {
  difficulty: 'medium',
  defenders: 3,
  speedMul: 1.0,
  roundSec: 120,
  sensitivity: 1.0,
  showCam: true,
  arScale: 0.4,
  touchMirror: false,
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
