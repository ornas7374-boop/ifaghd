// "AR mirror" mode (works on iPhone, Android, desktop): the phone stands still on a stand,
// the front camera is the live background, and the arena is placed on YOUR real floor.
// Floor height and distance come from your body: a standing person's nose→ankle span in
// the image gives the distance, and the ankles give the floor line.
import * as THREE from 'three';
import { PITCH } from './config.js';

const NOSE_TO_ANKLE_M = 1.5;   // typical adult; only sets the scale of the estimate
const FRONT_CAM_HFOV = 64;     // degrees, typical phone/laptop front camera (landscape stream)

export class MirrorAR {
  constructor(ar, video) {
    this.ar = ar; this.video = video;
    this.floor = null;           // {x, y, d} in camera space (metres)
    this.offset = new THREE.Vector3(0, 0, 0); // user drag offset (world)
    this.yaw = 0; this.scale = 0.5;
    this._lumT = 0;
    this._lc = document.createElement('canvas'); this._lc.width = 16; this._lc.height = 12;
    this._lx = this._lc.getContext('2d', { willReadFrequently: true });
  }

  // Camera intrinsics of the stream (vertical/horizontal tan of half-FOV).
  _tans() {
    const vw = this.video.videoWidth || 640, vh = this.video.videoHeight || 480;
    const aspect = vw / vh;
    // The quoted HFOV is for the long side of the sensor.
    const tLong = Math.tan(THREE.MathUtils.degToRad(FRONT_CAM_HFOV / 2));
    const tH = aspect >= 1 ? tLong : tLong * aspect;
    const tV = aspect >= 1 ? tLong / aspect : tLong;
    return { tH, tV, aspect };
  }

  // Match the 3D camera to the video as displayed with object-fit: cover.
  fitCamera() {
    const cam = this.ar.camera, { tH, tV, aspect } = this._tans();
    const ca = cam.aspect;
    // visible vertical half-tan after cover-cropping
    const tVis = ca > aspect ? tV * (aspect / ca) : tV;
    cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(tVis));
    cam.position.set(0, 0, 0); cam.rotation.set(0, 0, 0);
    cam.updateProjectionMatrix();
    this._visTH = tVis * ca; this._visTV = tVis;
    void tH;
  }

  // Estimate floor from mirrored, normalized landmarks (x,y in 0..1 of the video frame).
  estimate(raw) {
    if (!raw) return null;
    const n = raw[0], la = raw[27], ra = raw[28];
    if (!(n?.v > 0.5 && la?.v > 0.45 && ra?.v > 0.45)) return null;
    const { tH, tV } = this._tans();
    const ankleY = (la.y + ra.y) / 2, ankleX = (la.x + ra.x) / 2;
    const span = ankleY - n.y; if (span < 0.15) return null;
    const d = NOSE_TO_ANKLE_M / (span * 2 * tV);
    const y = -(ankleY - 0.5) * 2 * tV * d;
    const x = (ankleX - 0.5) * 2 * tH * d;
    const e = { x, y, d };
    this.floor = this.floor ? { x: lerp(this.floor.x, x, 0.15), y: lerp(this.floor.y, y, 0.15), d: lerp(this.floor.d, d, 0.15) } : e;
    return this.floor;
  }

  // Default when feet are not visible: phone ~0.9 m above the floor, user ~2.5 m away.
  fallbackFloor() { if (!this.floor) this.floor = { x: 0, y: -0.9, d: 2.5 }; return this.floor; }

  // Arena sits on the floor: the kick-off spot just in front of your feet, the goal further into the room.
  apply() {
    const f = this.floor || this.fallbackFloor();
    const s = this.scale;
    const pos = new THREE.Vector3(f.x * 0.3, f.y, -(f.d - 0.3) - PITCH.startZ * s).add(this.offset);
    this.ar.setArenaTransform(pos, this.yaw, s);
  }

  drag(dxPx, dyPx, viewW, viewH) {
    const f = this.floor || this.fallbackFloor();
    const depth = f.d + PITCH.startZ * this.scale;
    this.offset.x += (dxPx / viewW) * 2 * (this._visTH || 0.6) * depth;
    this.offset.z += (dyPx / viewH) * 2 * (this._visTV || 0.5) * depth * 2.5; // floor is foreshortened
    this.offset.z = Math.max(-6, Math.min(Math.max(0, f.d - 0.8), this.offset.z));
    this.apply();
  }
  setScale(s) { this.scale = Math.max(0.15, Math.min(1.2, s)); this.apply(); }
  rotate(d) { this.yaw += d; this.apply(); }

  // Cheap light estimation from the camera image: average brightness + tint.
  updateLight(dt) {
    this._lumT -= dt; if (this._lumT > 0 || this.video.readyState < 2) return;
    this._lumT = 0.5;
    this._lx.drawImage(this.video, 0, 0, 16, 12);
    const d = this._lx.getImageData(0, 0, 16, 12).data;
    let r = 0, g = 0, b = 0; const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    r /= n * 255; g /= n * 255; b /= n * 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const m = Math.max(r, g, b) || 1;
    const tint = new THREE.Color(0.75 + 0.25 * (r / m), 0.75 + 0.25 * (g / m), 0.75 + 0.25 * (b / m));
    this.ar.setAmbient(0.35 + lum * 1.6, tint);
  }
}

const lerp = (a, b, t) => a + (b - a) * t;
