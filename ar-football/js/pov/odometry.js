// Visual odometry on the floor: where did the phone MOVE between two camera frames?
//
// Browsers (Safari especially) give no 6DoF tracking, but we can recover walking motion from video:
//   1. downscale frames to ~96 px wide gray images;
//   2. for a grid of 8×8 blocks BELOW the horizon, predict where each block should land if the phone
//      only ROTATED (known from the gyro), then block-match around that prediction (±4 px);
//   3. the floor is a plane at known depth (phone height h), so a block's ray fixes its 3D point; solve
//      the camera translation t (Gauss-Newton + Huber weights) that explains the observed positions.
//
// Honest limits: needs a floor with some texture and light; scales with the assumed phone height; drifts
// slowly (fine for duels within a few metres); moving things (your legs, the ball) are masked/rejected.
import * as THREE from 'three';

const _inv = new THREE.Quaternion(), _p = new THREE.Vector3(), _d = new THREE.Vector3();
const B = 8, S = 4; // block size, search radius (px at 96-px width)

export class Odometry {
  constructor({ W = 96 } = {}) {
    this.W = W; this.H = 72;
    this.cv = document.createElement('canvas'); this.ctx = this.cv.getContext('2d', { willReadFrequently: true });
    this.prev = null; this.prevQ = new THREE.Quaternion(); this.prevT = 0; this.lastVT = -1;
    this.pos = { x: 0, z: 0 }; this.vel = { x: 0, z: 0 };
    this.quality = 0; this.confidence = 0; this.tracking = false; this.lostT = 0;
    this.stats = { blocks: 0, inliers: 0, rms: 0, ms: 0, hz: 0 }; this._n = 0; this._t0 = performance.now();
    this.minInterval = 0.05; this.horizonMargin = 0.28; this.ridge = 1e-2;
  }

  _gray(src) {
    // src: HTMLVideoElement or HTMLCanvasElement (tests). Box-filter 4×4 down to W×H: the browser's own
    // drawImage downscale aliases fine floor texture (moiré), which breaks block matching.
    const vw = src.videoWidth || src.width, vh = src.videoHeight || src.height, K = 4;
    this.H = Math.max(24, Math.round(this.W * vh / vw));
    const bw = this.W * K, bh = this.H * K;
    if (this.cv.width !== bw || this.cv.height !== bh) { this.cv.width = bw; this.cv.height = bh; }
    this.ctx.imageSmoothingEnabled = true; this.ctx.drawImage(src, 0, 0, bw, bh);
    const d = this.ctx.getImageData(0, 0, bw, bh).data, g = new Uint8Array(this.W * this.H);
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      let s = 0;
      for (let j = 0; j < K; j++) { let i = ((y * K + j) * bw + x * K) * 4; for (let k = 0; k < K; k++, i += 4) s += d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29; }
      g[y * this.W + x] = (s / (K * K)) / 256;
    }
    return g;
  }

  // q: camera→world orientation (THREE.Quaternion). h: phone height above the floor (m).
  // tH,tV: tan of the half-FOVs of the full video frame. skip(u,v): true where blocks must be ignored (ball…).
  step(src, q, h, tH, tV, skip, now = performance.now() / 1000) {
    const vt = src.currentTime ?? now;
    if (src.currentTime !== undefined && src.currentTime === this.lastVT) return null;
    if (this.prev && now - this.prevT < this.minInterval) return null;
    const t0 = performance.now();
    const gray = this._gray(src);
    this.lastVT = vt;
    let out = null;
    if (this.prev && this.prev.length === gray.length && h > 0.2) {
      const dt = Math.max(0.02, now - this.prevT);
      out = this._solve(this.prev, gray, this.prevQ, q, h, tH, tV, skip);
      if (out) {
        this.pos.x += out.t.x; this.pos.z += out.t.z;
        const k = Math.min(1, dt * 6);
        this.vel.x += (out.t.x / dt - this.vel.x) * k; this.vel.z += (out.t.z / dt - this.vel.z) * k;
        this.tracking = true; this.lostT = 0;
      } else {
        this.lostT += dt; if (this.lostT > 0.6) this.tracking = false;
        this.vel.x *= 0.85; this.vel.z *= 0.85;      // no evidence → coast to a stop
      }
    }
    this.prev = gray; this.prevQ.copy(q); this.prevT = now;
    this.stats.ms = this.stats.ms * 0.8 + (performance.now() - t0) * 0.2;
    this._n++; const tn = performance.now(); if (tn - this._t0 > 1000) { this.stats.hz = this._n * 1000 / (tn - this._t0); this._n = 0; this._t0 = tn; }
    return out;
  }

  _solve(A, Bm, q0, q1, h, tH, tV, skip) {
    const W = this.W, H = this.H;
    // relative rotation must be modest (the gyro-predicted search window is only ±S px)
    if (2 * Math.acos(Math.min(1, Math.abs(q0.dot(q1)))) > 0.35) return null;
    _inv.copy(q1).invert();
    const blocks = [];
    for (let by = 6; by + B + 6 <= H; by += B) for (let bx = 6; bx + B + 6 <= W; bx += B) {
      const cx = bx + B / 2, cy = by + B / 2, u = cx / W, v = cy / H;
      if (skip && skip(u, v)) continue;
      // ray of the block centre in WORLD space (previous orientation); must hit the floor with margin
      const rw = new THREE.Vector3((u - 0.5) * 2 * tH, -(v - 0.5) * 2 * tV, -1).applyQuaternion(q0);
      if (rw.y > -this.horizonMargin) continue;   // far floor: tiny parallax, aliased texture → ignore
      // texture check
      let tex = 0;
      for (let y = 0; y < B; y++) for (let x = 0; x < B - 1; x++) tex += Math.abs(A[(by + y) * W + bx + x + 1] - A[(by + y) * W + bx + x]);
      if (tex < 3.2 * B * B * 0.25) continue;
      // where would a pure rotation put it in the new frame?
      _d.copy(rw).applyQuaternion(_inv);
      if (_d.z > -0.05) continue;
      const px = (0.5 + (_d.x / -_d.z) / (2 * tH)) * W, py = (0.5 - (_d.y / -_d.z) / (2 * tV)) * H;
      const rx = Math.round(px), ry = Math.round(py);
      if (rx - B / 2 - S < 1 || ry - B / 2 - S < 1 || rx + B / 2 + S >= W - 1 || ry + B / 2 + S >= H - 1) continue;
      // block matching (SAD) around the prediction
      const n = 2 * S + 1, sad = new Float32Array(n * n); let best = 1e9, bi = 0, sum = 0;
      for (let oy = -S; oy <= S; oy++) for (let ox = -S; ox <= S; ox++) {
        let s = 0;
        for (let y = 0; y < B; y++) {
          const ia = (by + y) * W + bx, ib = (ry - B / 2 + oy + y) * W + (rx - B / 2 + ox);
          for (let x = 0; x < B; x++) { const dd = A[ia + x] - Bm[ib + x]; s += dd < 0 ? -dd : dd; }
        }
        const k = (oy + S) * n + ox + S; sad[k] = s; sum += s; if (s < best) { best = s; bi = k; }
      }
      const mean = sum / (n * n), conf = 1 - best / (mean + 1e-6);
      if (conf < 0.35) continue;
      const bxo = bi % n, byo = (bi / n) | 0;
      let sx = 0, sy = 0;
      if (bxo > 0 && bxo < n - 1) { const l = sad[bi - 1], r = sad[bi + 1], c = sad[bi], dn = l - 2 * c + r; if (dn > 1e-6) sx = 0.5 * (l - r) / dn; }
      if (byo > 0 && byo < n - 1) { const t = sad[bi - n], b = sad[bi + n], c = sad[bi], dn = t - 2 * c + b; if (dn > 1e-6) sy = 0.5 * (t - b) / dn; }
      blocks.push({ rw: rw.normalize(), ox: rx + (bxo - S) + sx, oy: ry + (byo - S) + sy, w: conf });
    }
    this.stats.blocks = blocks.length;
    if (blocks.length < 14) return null;

    // Gauss-Newton on the translation t = (tx, ty, tz) of the camera in world axes.
    const t = new THREE.Vector3(), N = blocks.length;
    const res = (tt, i, o) => {
      const b = blocks[i], k = h / -b.rw.y;
      _p.copy(b.rw).multiplyScalar(k).sub(tt).applyQuaternion(_inv);
      if (_p.z > -0.05) return false;
      o[0] = b.ox - (0.5 + (_p.x / -_p.z) / (2 * tH)) * W; o[1] = b.oy - (0.5 - (_p.y / -_p.z) / (2 * tV)) * H; return true;
    };
    const wgt = new Float32Array(N).fill(1), r0 = [0, 0], r1 = [0, 0], eps = 0.01;
    let ok = false;
    for (let it = 0; it < 5; it++) {
      const JtJ = [0, 0, 0, 0, 0, 0, 0, 0, 0], Jtr = [0, 0, 0];
      for (let i = 0; i < N; i++) {
        if (!res(t, i, r0)) continue;
        const J = [[0, 0, 0], [0, 0, 0]];
        for (let a = 0; a < 3; a++) {
          const tt = t.clone(); if (a === 0) tt.x += eps; else if (a === 1) tt.y += eps; else tt.z += eps;
          if (!res(tt, i, r1)) { J[0][a] = 0; J[1][a] = 0; continue; }
          J[0][a] = (r0[0] - r1[0]) / eps; J[1][a] = (r0[1] - r1[1]) / eps;   // d(−residual)/dt
        }
        const mag = Math.hypot(r0[0], r0[1]), hub = mag < 0.8 ? 1 : 0.8 / mag;  // Huber
        wgt[i] = blocks[i].w * hub;
        for (let c = 0; c < 2; c++) for (let a = 0; a < 3; a++) {
          Jtr[a] += wgt[i] * J[c][a] * r0[c];
          for (let b2 = 0; b2 < 3; b2++) JtJ[a * 3 + b2] += wgt[i] * J[c][a] * J[c][b2];
        }
      }
      // weak priors: ty ≈ 0 (hand bob), and a small ridge for conditioning
      JtJ[0] += this.ridge; JtJ[4] += 4e2; JtJ[8] += this.ridge; Jtr[1] -= 4e2 * t.y;  // ridge: poorly-observed axes shrink to 0
      const d = solve3(JtJ, Jtr); if (!d) break;
      t.x += d[0]; t.y += d[1]; t.z += d[2]; ok = true;
      if (Math.hypot(d[0], d[2]) < 1e-4) break;
    }
    if (!ok) return null;
    // quality: inlier ratio at the solution
    let inl = 0, sq = 0, cnt = 0;
    for (let i = 0; i < N; i++) if (res(t, i, r0)) { const m = Math.hypot(r0[0], r0[1]); cnt++; if (m < 0.9) inl++; sq += m * m; }
    const ratio = cnt ? inl / cnt : 0; this.stats.inliers = inl; this.stats.rms = Math.sqrt(sq / Math.max(1, cnt)); this.quality = ratio;
    // Confidence gate. Measured on synthetic floors: good texture → rms ≈ 0.2 px, inliers 100 %;
    // stripe-only floors (aperture problem) → rms 1.2–2 px, inliers ≈ 60 % → reject those steps.
    const good = ratio >= 0.8 && this.stats.rms < 0.9 && inl >= 10;
    this.confidence += ((good ? 1 : 0) - this.confidence) * 0.25;
    if (!good || Math.hypot(t.x, t.z) > 0.6) return null;
    return { t, inliers: inl, ratio };
  }
}

function solve3(M, b) {
  const [a, bb, c, d, e, f, g, h, i] = M, det = a * (e * i - f * h) - bb * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) return null;
  const inv = [(e * i - f * h), (c * h - bb * i), (bb * f - c * e), (f * g - d * i), (a * i - c * g), (c * d - a * f), (d * h - e * g), (bb * g - a * h), (a * e - bb * d)];
  return [(inv[0] * b[0] + inv[1] * b[1] + inv[2] * b[2]) / det, (inv[3] * b[0] + inv[4] * b[1] + inv[5] * b[2]) / det, (inv[6] * b[0] + inv[7] * b[1] + inv[8] * b[2]) / det];
}
