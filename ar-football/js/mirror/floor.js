// Stage 2 — floor, feet and scale from a single standing person.
//
// Geometry (camera at origin, looking down -z, y up; x is the MIRRORED image x so the 3D world
// matches what you see on screen):
//   • every landmark (u,v) defines a ray r = Rx(pitch)·(xn·tanH, −yn·tanV, −1)
//   • nose and heel lie on one vertical line at horizontal distance Z
//   • their vertical separation is known from your height: S = noseH − heelH
//       ⇒ Z = S / (n.y/−n.z − a.y/−a.z),   floor y = heel.y − heelH
// What this CAN'T know: the camera's true field of view (browsers don't expose it) and your
// exact height. A wrong height scales the whole estimate uniformly, which keeps on-screen
// alignment correct at your position. A wrong FOV or pitch tilts/skews the floor plane:
// objects at your depth still line up, objects much nearer/farther drift.

import * as THREE from 'three';

const NOSE_RATIO = 0.92;   // nose height ≈ 0.92 × body height (adult anthropometry)
const HEEL_H = 0.03;       // MediaPipe heel landmark ≈ 3 cm above the floor
const ANKLE_H = 0.075;     // ankle landmark ≈ 7.5 cm above the floor

export class FloorEstimator {
  constructor() {
    this.hfovDeg = 66;       // assumed FOV of the long side of the front camera
    this.userHeight = 1.70;  // metres, user-editable
    this.pitch = 0;          // radians, + = camera looks up
    this.pitchSource = 'assumed';
    this.videoW = 640; this.videoH = 480;
    this.samples = [];
    this.result = null;      // calibrated {floorY, Z, X, jitter:{y,z}, n}
    this.last = null;        // last per-frame estimate
  }

  setVideo(w, h) { this.videoW = w || 640; this.videoH = h || 480; }

  tans() {
    const a = this.videoW / this.videoH;
    const tLong = Math.tan(THREE.MathUtils.degToRad(this.hfovDeg / 2));
    return a >= 1 ? { tH: tLong, tV: tLong / a } : { tH: tLong * a, tV: tLong };
  }

  // Normalized mirrored (u,v) → world ray (unnormalized).
  ray(u, v) {
    const { tH, tV } = this.tans();
    const d = new THREE.Vector3((u - 0.5) * 2 * tH, -(v - 0.5) * 2 * tV, -1);
    return d.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
  }

  // World point → normalized mirrored (u,v). Inverse of ray().
  project(p) {
    const { tH, tV } = this.tans();
    const c = p.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), -this.pitch);
    if (c.z >= -1e-3) return null;
    return { u: 0.5 + (c.x / -c.z) / (2 * tH), v: 0.5 - (c.y / -c.z) / (2 * tV) };
  }

  // Intersect the ray through mirrored (u,v) with the horizontal plane y = planeY.
  rayToPlane(u, v, planeY) {
    const d = this.ray(u, v);
    if (d.y > -1e-4) return null;            // ray doesn't go down to the floor
    const t = planeY / d.y;                   // camera at origin
    return t > 0 ? d.multiplyScalar(t) : null;
  }

  // Live feet position on the CALIBRATED floor (more stable than re-solving with the nose).
  feetOnFloor(raw) {
    const r = this.result; if (!r || !raw) return null;
    const hl = raw[29], hr = raw[30], al = raw[27], ar = raw[28];
    let L, R, h;
    if (hl?.v > 0.5 && hr?.v > 0.5) { L = hl; R = hr; h = HEEL_H; }
    else if (al?.v > 0.5 && ar?.v > 0.5) { L = al; R = ar; h = ANKLE_H; }
    else return null;
    const pl = this.rayToPlane(L.x, L.y, r.floorY + h), pr = this.rayToPlane(R.x, R.y, r.floorY + h);
    if (!pl || !pr) return null;
    return { x: (pl.x + pr.x) / 2, z: (pl.z + pr.z) / 2, left: pl, right: pr };
  }

  // Per-frame estimate from mirrored normalized landmarks. Returns {ok, reason, ...}.
  estimate(raw) {
    if (!raw) return (this.last = { ok: false, reason: 'no-person' });
    const nose = raw[0];
    const hl = raw[29], hr = raw[30], al = raw[27], ar = raw[28];
    const heels = hl?.v > 0.5 && hr?.v > 0.5;
    const ankles = al?.v > 0.5 && ar?.v > 0.5;
    if (!(nose?.v > 0.5)) return (this.last = { ok: false, reason: 'no-head' });
    if (!heels && !ankles) return (this.last = { ok: false, reason: 'no-feet' });
    const fl = heels ? hl : al, fr = heels ? hr : ar, footH = heels ? HEEL_H : ANKLE_H;
    const fv = (fl.y + fr.y) / 2, fuAvg = (fl.x + fr.x) / 2;
    const n = this.ray(nose.x, nose.y), a = this.ray(fuAvg, fv);
    const S = this.userHeight * NOSE_RATIO - footH;
    const denom = n.y / -n.z - a.y / -a.z;
    if (!(denom > 0.05)) return (this.last = { ok: false, reason: 'bad-geometry' });
    const Z = S / denom;
    const foot = a.clone().multiplyScalar(Z / -a.z);
    const floorY = foot.y - footH;
    // feet individually (for drawing / stance width)
    const L = this.ray(fl.x, fl.y), R = this.ray(fr.x, fr.y);
    const pl = L.multiplyScalar(Z / -L.z), pr = R.multiplyScalar(Z / -R.z);
    return (this.last = { ok: true, Z, X: foot.x, floorY, footSource: heels ? 'heels' : 'ankles', feet: [pl, pr], noseV: nose.y, footV: fv });
  }

  // Accumulate a still-standing window → robust calibration (median + jitter).
  addSample(e, dt) {
    if (!e?.ok) { this.samples.length = 0; return 0; }
    this.samples.push({ ...e, dt });
    let T = 0; for (const s of this.samples) T += s.dt;
    // keep a ≥1.5 s window (dropping the oldest sample only if the rest still covers 1.5 s)
    while (this.samples.length > 2 && T - this.samples[0].dt >= 1.5) T -= this.samples.shift().dt;
    // Must be still: if the feet moved > 6 cm during the window, restart.
    const zs = this.samples.map((s) => s.Z), xs = this.samples.map((s) => s.X);
    if (Math.max(...xs) - Math.min(...xs) > 0.12 || Math.max(...zs) - Math.min(...zs) > 0.35) { this.samples = this.samples.slice(-3); return 0; }
    return Math.min(1, T / 1.5);
  }

  finish() {
    const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
    const sd = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length); };
    const zs = this.samples.map((s) => s.Z), xs = this.samples.map((s) => s.X), ys = this.samples.map((s) => s.floorY);
    this.result = {
      floorY: med(ys), Z: med(zs), X: med(xs), n: this.samples.length,
      jitter: { y: sd(ys), z: sd(zs), x: sd(xs) },
      pitch: this.pitch, pitchSource: this.pitchSource, hfov: this.hfovDeg, height: this.userHeight,
      footSource: this.samples.at(-1).footSource,
    };
    return this.result;
  }

  // Two-position pitch solve: the floor is one plane, so the floor height measured at two
  // different distances must match. Search the pitch that makes them agree.
  solvePitch(rawA, rawB) {
    const save = this.pitch;
    let best = null;
    for (let deg = -30; deg <= 30; deg += 0.25) {
      this.pitch = THREE.MathUtils.degToRad(deg);
      const a = this.estimate(rawA), b = this.estimate(rawB);
      if (!a.ok || !b.ok) continue;
      const err = Math.abs(a.floorY - b.floorY);
      if (!best || err < best.err) best = { deg, err, dz: Math.abs(a.Z - b.Z) };
    }
    this.pitch = save;
    return best;
  }
}

// Camera pitch from the phone's orientation sensor (screen normal elevation).
// iOS needs DeviceOrientationEvent.requestPermission() from a tap.
export class TiltSensor {
  constructor() { this.pitch = null; this.roll = null; this.available = false; this.moved = 0; this._ref = null; }
  async start() {
    const DOE = window.DeviceOrientationEvent;
    if (!DOE) return false;
    if (typeof DOE.requestPermission === 'function') {
      try { if ((await DOE.requestPermission()) !== 'granted') return false; } catch { return false; }
    }
    addEventListener('deviceorientation', (e) => {
      if (e.beta == null || e.gamma == null) return;
      const b = THREE.MathUtils.degToRad(e.beta), g = THREE.MathUtils.degToRad(e.gamma);
      // Front camera looks along the screen normal; its elevation = asin(cosβ·cosγ).
      this.pitch = Math.asin(Math.max(-1, Math.min(1, Math.cos(b) * Math.cos(g))));
      this.roll = g;
      this.available = true;
      if (this._ref !== null) this.moved = Math.abs(this.pitch - this._ref);
    });
    return true;
  }
  lockReference() { this._ref = this.pitch; this.moved = 0; }
}
