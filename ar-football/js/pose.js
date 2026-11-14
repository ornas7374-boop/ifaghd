// Camera + MediaPipe Pose + body-motion interpretation.
//
// Pipeline per video frame:
//   webcam frame → PoseLandmarker (lite, GPU) → 33 landmarks
//   → mirror + aspect-correct → One-Euro smoothing
//   → BodyController: steer / run / depth + events (touch, kick, feint, handsUp)

import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const MODEL_URL = new URL('../models/pose_landmarker_lite.task', import.meta.url).href;

// Landmark indices (BlazePose topology)
export const LM = {
  nose: 0, lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16,
  lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28, lFoot: 31, rFoot: 32,
};
export const BONES = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 31], [24, 26], [26, 28], [28, 32],
];

// ---------- One-Euro filter: low lag on fast moves, low jitter when still ----------
class OneEuro {
  constructor(minCutoff = 1.2, beta = 0.6, dCutoff = 1.0) {
    this.minCutoff = minCutoff; this.beta = beta; this.dCutoff = dCutoff;
    this.x = null; this.dx = 0; this.t = 0;
  }
  static alpha(cutoff, dt) { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); }
  filter(v, t) {
    if (this.x === null) { this.x = v; this.t = t; return v; }
    const dt = Math.max(1e-3, t - this.t); this.t = t;
    const dv = (v - this.x) / dt;
    this.dx += OneEuro.alpha(this.dCutoff, dt) * (dv - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += OneEuro.alpha(cutoff, dt) * (v - this.x);
    return this.x;
  }
  reset() { this.x = null; this.dx = 0; }
}

// ---------- Camera + landmarker ----------
export class PoseTracker {
  constructor(video) {
    this.video = video;
    this.landmarker = null;
    this.stream = null;
    this.lastVideoTime = -1;
    this.points = null;        // smoothed, mirrored, aspect-corrected landmarks [{x,y,v}]
    this.raw = null;           // mirrored normalized (for drawing) [{x,y,v}]
    this.lastSeen = 0;
    this.fps = 0; this._fc = 0; this._ft = performance.now();
    this.inferMs = 0;
    this.filters = Array.from({ length: 33 }, () => [new OneEuro(), new OneEuro()]);
    this.delegate = 'GPU';
    this.onResult = null;
    this.maskOn = false;       // person segmentation (optional, used for occlusion in the mirror lab)
    this.mask = null;          // { data: Uint8Array (0..255), w, h, version }
  }

  // Enable/disable the person segmentation mask (extra cost per frame).
  async setMask(on) {
    if (!this.landmarker || this.maskOn === on) return;
    await this.landmarker.setOptions({ outputSegmentationMasks: on });
    this.maskOn = on;
    if (!on) this.mask = null;
  }

  async startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('NO_MEDIA');
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 } },
    });
    this.video.srcObject = this.stream;
    this.video.muted = true; this.video.playsInline = true;
    await this.video.play();
    await new Promise((r) => (this.video.readyState >= 2 ? r() : this.video.addEventListener('loadeddata', r, { once: true })));
  }

  async loadModel(prefer = 'GPU') {
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    const opts = (delegate) => ({
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO', numPoses: 1,
      minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
    });
    try {
      if (prefer !== 'GPU') throw new Error('CPU requested');
      this.landmarker = await PoseLandmarker.createFromOptions(fileset, opts('GPU'));
      this.delegate = 'GPU';
    } catch (e) {
      console.warn('GPU delegate failed, falling back to CPU', e);
      this.landmarker = await PoseLandmarker.createFromOptions(fileset, opts('CPU'));
      this.delegate = 'CPU';
    }
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  // Call every animation frame; runs inference only when a new video frame exists.
  update() {
    const v = this.video;
    if (!this.landmarker || v.readyState < 2 || v.currentTime === this.lastVideoTime) return false;
    this.lastVideoTime = v.currentTime;
    const now = performance.now();
    const t0 = now;
    this.landmarker.detectForVideo(v, now, (res) => {
      const lms = res.landmarks?.[0];
      if (!lms) { this.points = null; this.raw = null; return; }
      const aspect = (v.videoWidth || 4) / (v.videoHeight || 3);
      const t = now / 1000;
      const raw = new Array(33), pts = new Array(33);
      for (let i = 0; i < 33; i++) {
        const p = lms[i];
        const mx = 1 - p.x; // mirror: your right = screen right
        const vis = p.visibility ?? 1;
        raw[i] = { x: mx, y: p.y, v: vis };
        pts[i] = { x: this.filters[i][0].filter(mx * aspect, t), y: this.filters[i][1].filter(p.y, t), v: vis };
      }
      this.raw = raw; this.points = pts; this.lastSeen = now;
      const m = res.segmentationMasks?.[0];
      if (m) {
        // Copy out now: the mask is only valid inside this callback.
        // Uint8 readback is the most portable (float readback fails on some WebGL drivers).
        const n = m.width * m.height;
        if (!this.mask || this.mask.data.length !== n) this.mask = { data: new Uint8Array(n), w: m.width, h: m.height, version: 0 };
        try {
          this.mask.data.set(m.getAsUint8Array().subarray(0, n));
        } catch {
          const f = m.getAsFloat32Array(), d = this.mask.data;
          for (let i = 0; i < n; i++) d[i] = f[i] * 255;
        }
        this.mask.version++;
        // health: share of pixels marked "person" (sampled). 0 while a body is tracked = broken readback.
        let hit = 0, cnt = 0; const d = this.mask.data;
        for (let i = 0; i < n; i += 211) { cnt++; if (d[i] > 127) hit++; }
        this.mask.coverage = hit / cnt;
      }
    });
    this.inferMs = this.inferMs * 0.9 + (performance.now() - t0) * 0.1;
    this._fc++;
    if (now - this._ft > 1000) { this.fps = (this._fc * 1000) / (now - this._ft); this._fc = 0; this._ft = now; }
    return true;
  }

  get tracking() { return !!this.points && performance.now() - this.lastSeen < 400; }
}

// ---------- Body motion → game intent ----------
const vis = (p, th = 0.5) => p && p.v >= th;
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class BodyController {
  constructor() {
    this.sensitivity = 1;
    this.reset();
  }

  reset() {
    this.calib = null;
    this.calibSamples = [];
    this.feet = [this._foot(), this._foot()];
    this.stepTimes = [];
    this.run = 0; this.steer = 0; this.depth = 0;
    this.prevHipX = null; this.hipVx = 0; this.lastSigVxSign = 0; this.lastSigVxTime = 0; this.lastFeint = 0;
    this.handsUpSince = 0; this.handsFired = false;
    this.source = 'none';
    this.events = [];
    this.lastT = 0;
  }

  _foot() { return { base: null, lifted: false, kicked: false, h: 0, prevH: 0, vel: 0 }; }

  // Returns checklist used by the calibration screen.
  frameCheck(pts) {
    if (!pts) return { body: false, shoulders: false, hips: false, feet: false, knees: false };
    return {
      body: true,
      shoulders: vis(pts[LM.lShoulder]) && vis(pts[LM.rShoulder]),
      hips: vis(pts[LM.lHip]) && vis(pts[LM.rHip]),
      knees: vis(pts[LM.lKnee], 0.45) && vis(pts[LM.rKnee], 0.45),
      feet: vis(pts[LM.lAnkle], 0.45) && vis(pts[LM.rAnkle], 0.45),
    };
  }

  // Collect neutral stance; returns progress 0..1 (1 = calibrated).
  calibrate(pts, dt) {
    const c = this.frameCheck(pts);
    if (!c.shoulders || !c.hips) { this.calibSamples.length = 0; return 0; }
    const sh = mid(pts[LM.lShoulder], pts[LM.rShoulder]);
    const hp = mid(pts[LM.lHip], pts[LM.rHip]);
    this.calibSamples.push({ hx: hp.x, hy: hp.y, L: dist(sh, hp), dt });
    const total = this.calibSamples.reduce((s, x) => s + x.dt, 0);
    if (total < 1.2) return total / 1.2;
    const n = this.calibSamples.length;
    const avg = (k) => this.calibSamples.reduce((s, x) => s + x[k], 0) / n;
    this.calib = { cx: avg('hx'), hy: avg('hy'), L: avg('L') };
    this.feet = [this._foot(), this._foot()];
    return 1;
  }

  // Main per-frame interpretation. Pushes events into this.events.
  update(pts, t) {
    const dt = this.lastT ? Math.min(0.1, t - this.lastT) : 1 / 30;
    this.lastT = t;
    if (!pts || !this.calib) { this._decay(dt); return; }
    const S = this.sensitivity;
    const ls = pts[LM.lShoulder], rs = pts[LM.rShoulder], lh = pts[LM.lHip], rh = pts[LM.rHip];
    if (!vis(ls) || !vis(rs) || !vis(lh) || !vis(rh)) { this._decay(dt); return; }

    const sh = mid(ls, rs), hp = mid(lh, rh);
    const L = Math.max(0.05, dist(sh, hp));
    const L0 = this.calib.L;

    // --- Lateral: body position + upper-body lean, in torso units ---
    const offset = (hp.x - this.calib.cx) / L0;
    const lean = (sh.x - hp.x) / L;
    const lateral = offset + lean * 1.4;
    const dz = 0.1 / S;
    const s = Math.sign(lateral) * Math.max(0, Math.abs(lateral) - dz);
    this.steer = clamp(s * 1.8 * S, -1, 1);

    // --- Depth: scale of torso → stepping toward / away from the camera ---
    const scale = L / L0;
    this.depth = clamp(((scale - 1) / 0.18) * S, -1, 1);
    if (Math.abs(this.depth) < 0.25) this.depth = 0;

    // --- Feint / cut: fast hip lateral velocity that reverses direction ---
    if (this.prevHipX !== null) {
      const vx = (hp.x - this.prevHipX) / L0 / dt;
      this.hipVx = this.hipVx * 0.6 + vx * 0.4;
      const thr = 2.0 / S;
      if (Math.abs(this.hipVx) > thr) {
        const sg = Math.sign(this.hipVx);
        if (this.lastSigVxSign && sg !== this.lastSigVxSign && t - this.lastSigVxTime < 0.9 && t - this.lastFeint > 0.6) {
          this.events.push({ type: 'feint', dir: sg });
          this.lastFeint = t;
        }
        this.lastSigVxSign = sg; this.lastSigVxTime = t;
      }
    }
    this.prevHipX = hp.x;

    // --- Feet: running in place (cadence) and kicks ---
    // Prefer ankles, fall back to knees, then to hip bounce.
    const ankles = [pts[LM.lAnkle], pts[LM.rAnkle]];
    const knees = [pts[LM.lKnee], pts[LM.rKnee]];
    let joints = null, liftThr = 0, kickThr = 0;
    if (vis(ankles[0], 0.4) && vis(ankles[1], 0.4)) { joints = ankles; this.source = 'feet'; liftThr = 0.13; kickThr = 0.42; }
    else if (vis(knees[0], 0.4) && vis(knees[1], 0.4)) { joints = knees; this.source = 'knees'; liftThr = 0.1; kickThr = 0.3; }
    else { this.source = 'hips'; }

    if (joints) {
      liftThr /= S; kickThr /= S;
      for (let i = 0; i < 2; i++) {
        const f = this.feet[i], y = joints[i].y;
        // Ground baseline: follows downward quickly, upward slowly (so lifts stand out).
        if (f.base === null) f.base = y;
        f.base = y > f.base ? f.base + (y - f.base) * 0.35 : f.base + (y - f.base) * 0.012;
        f.prevH = f.h;
        f.h = (f.base - y) / L;           // lift height in torso units
        f.vel = (f.h - f.prevH) / dt;
        if (!f.lifted && f.h > liftThr) {
          f.lifted = true;
          this.stepTimes.push(t);
          this.events.push({ type: 'touch', foot: i === 0 ? 'L' : 'R' });
        } else if (f.lifted && f.h < liftThr * 0.45) {
          f.lifted = false; f.kicked = false;
        }
        if (f.lifted && !f.kicked && f.h > kickThr && f.vel > 1.2) {
          f.kicked = true;
          this.events.push({ type: 'kick', foot: i === 0 ? 'L' : 'R', power: clamp((f.h - kickThr) / kickThr + 0.5, 0.4, 1) });
        }
      }
    } else {
      // Hip bounce: count upward crossings of the calibrated hip line.
      const f = this.feet[0];
      const h = (this.calib.hy - hp.y) / L0;
      if (!f.lifted && h > 0.06 / S) { f.lifted = true; this.stepTimes.push(t); this.events.push({ type: 'touch', foot: 'R' }); }
      else if (f.lifted && h < 0.02 / S) f.lifted = false;
    }

    // Cadence over the last second → run intensity (≈4 steps/s = full sprint).
    while (this.stepTimes.length && t - this.stepTimes[0] > 1.0) this.stepTimes.shift();
    const target = clamp(this.stepTimes.length / 4, 0, 1);
    this.run += (target - this.run) * Math.min(1, dt * (target > this.run ? 8 : 3));

    // --- Both hands above the head for 0.9 s → pause toggle ---
    const lw = pts[LM.lWrist], rw = pts[LM.rWrist], nose = pts[LM.nose];
    if (vis(lw) && vis(rw) && vis(nose) && lw.y < nose.y - 0.05 && rw.y < nose.y - 0.05) {
      if (!this.handsUpSince) this.handsUpSince = t;
      if (!this.handsFired && t - this.handsUpSince > 0.9) { this.handsFired = true; this.events.push({ type: 'handsUp' }); }
    } else { this.handsUpSince = 0; this.handsFired = false; }
  }

  _decay(dt) {
    this.run *= Math.max(0, 1 - dt * 4);
    this.steer *= Math.max(0, 1 - dt * 6);
    this.depth = 0;
  }

  drain() { const e = this.events; this.events = []; return e; }
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
