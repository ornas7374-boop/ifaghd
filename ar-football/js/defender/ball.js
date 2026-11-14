// Real-ball tracking with MediaPipe Object Detector (EfficientDet-Lite0, COCO class "sports ball").
// The ball's floor position = ray through the bottom of its box ∩ the calibrated floor plane.
// Cross-check: the box size must match a 22 cm ball at that distance (rejects heads, lamps…).
import { FilesetResolver, ObjectDetector } from '@mediapipe/tasks-vision';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const MODEL_URL = new URL('../../models/efficientdet_lite0.tflite', import.meta.url).href;
export const BALL_D = 0.22; // size-5 football diameter (m)

export class BallTracker {
  constructor(video) {
    this.video = video; this.det = null; this.every = 2; this._n = 0; this._lastT = -1;
    this.box = null; this.lastSeen = 0; this.pos = null; this.vel = { x: 0, z: 0 }; this.inferMs = 0; this.score = 0;
    this.sizeErr = null;
  }
  async load() {
    const fs = await FilesetResolver.forVisionTasks(WASM_URL);
    const opts = (delegate) => ({ baseOptions: { modelAssetPath: MODEL_URL, delegate }, runningMode: 'VIDEO', scoreThreshold: 0.2, maxResults: 3, categoryAllowlist: ['sports ball'] });
    try { this.det = await ObjectDetector.createFromOptions(fs, opts('GPU')); this.delegate = 'GPU'; }
    catch { this.det = await ObjectDetector.createFromOptions(fs, opts('CPU')); this.delegate = 'CPU'; }
  }
  // Run on every `every`-th new video frame (the ball moves slower than the cost is worth).
  update(floor) {
    const v = this.video;
    if (!this.det || v.readyState < 2 || v.currentTime === this._lastT) return;
    this._lastT = v.currentTime;
    if (++this._n % this.every) return;
    const t0 = performance.now();
    const res = this.det.detectForVideo(v, t0);
    this.inferMs = this.inferMs * 0.8 + (performance.now() - t0) * 0.2;
    const W = v.videoWidth, H = v.videoHeight;
    let best = null;
    for (const d of res.detections || []) {
      const b = d.boundingBox, sc = d.categories[0]?.score || 0;
      // mirrored, normalized box
      const ux = (b.originX + b.width / 2) / W;
      const box = { cx: this.mirror === false ? ux : 1 - ux, top: b.originY / H, bottom: (b.originY + b.height) / H, w: b.width / W, h: b.height / H, score: sc };
      const p = floor?.result ? floor.rayToPlane(box.cx, box.bottom, floor.result.floorY) : null;
      if (p) {
        // expected angular size of a 22 cm ball at that distance vs. observed
        const { tH } = floor.tans(); const dist = p.length();
        const expectW = BALL_D / dist / (2 * tH);
        box.sizeErr = box.w / expectW;              // ≈1 for a real football on the floor
        if (box.sizeErr < 0.45 || box.sizeErr > 2.2) continue;
      }
      if (!best || sc > best.score) { best = box; best.p = p; }
    }
    if (!best) return;
    this.box = best; this.score = best.score; this.sizeErr = best.sizeErr ?? null;
    const now = performance.now();
    if (best.p) {
      const np = { x: best.p.x, z: best.p.z };
      if (this.pos) {
        const dt = Math.max(0.016, (now - this.lastSeen) / 1000);
        const k = 0.5; // light smoothing; detector boxes jitter ±a few px
        const sx = this.pos.x + (np.x - this.pos.x) * k, sz = this.pos.z + (np.z - this.pos.z) * k;
        this.vel = { x: this.vel.x * 0.6 + ((sx - this.pos.x) / dt) * 0.4, z: this.vel.z * 0.6 + ((sz - this.pos.z) / dt) * 0.4 };
        this.pos = { x: sx, z: sz };
      } else this.pos = np;
    }
    this.lastSeen = now;
  }
  get seen() { return performance.now() - this.lastSeen < 600; }
}
