// A realistic footballer: Mixamo motion-captured humanoid (Xbot.glb: idle / walk / run) dressed in a
// football kit by painting vertex colours according to which bone owns each vertex, plus procedural
// overlays (forward lean, lunge/slide-tackle, off-balance) applied on top of the mocap each frame.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const MODEL_URL = new URL('../../models/Xbot.glb', import.meta.url).href;
let cached = null;
export async function loadFootballerTemplate() {
  cached ||= new GLTFLoader().loadAsync(MODEL_URL);
  return cached;
}

const SKIN = [0xc68c5f, 0x8d5a3b, 0xe0b48a, 0x6b4128, 0xd9a577];
const REGION_COLORS = (kit) => ({
  skin: new THREE.Color(kit.skin), jersey: new THREE.Color(kit.shirt), shorts: new THREE.Color(kit.shorts),
  socks: new THREE.Color(kit.socks), boots: new THREE.Color(kit.boots), hair: new THREE.Color(0x1a120d),
});

// Decide the kit region of a vertex from its dominant bone and its height (fraction of body height).
function region(bone, h) {
  const b = bone.toLowerCase();
  if (b.includes('head')) return h > 0.93 ? 'hair' : 'skin';
  if (b.includes('neck')) return 'skin';
  if (b.includes('hand') || b.includes('forearm')) return 'skin';
  if (b.includes('shoulder') || /arm$/.test(b) || b.includes('spine')) return 'jersey';
  if (b.includes('hips')) return h > 0.5 ? 'jersey' : 'shorts';
  if (b.includes('upleg')) return h > 0.30 ? 'shorts' : 'skin';          // thigh: shorts down to just above the knee
  if (b.includes('foot') || b.includes('toe')) return 'boots';
  if (b.includes('leg')) return h > 0.27 ? 'skin' : 'socks';              // shin: knee skin, then socks
  return 'jersey';
}

function paintKit(root, kit) {
  const C = REGION_COLORS(kit);
  const box = new THREE.Box3().setFromObject(root); const H = box.max.y - box.min.y, y0 = box.min.y;
  root.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const g = o.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    const names = o.skeleton.bones.map((b) => b.name);
    const col = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      let best = 0, bw = -1;
      for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); // bind pose, world scale
      const c = C[region(names[best] || '', (v.y - y0) / H)];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    o.material = mats.map((m) => { const n = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.0 }); n.name = m.name; return n; });
    if (o.material.length === 1) o.material = o.material[0];
    o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
  });
}

const BONES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'RightUpLeg', 'RightLeg', 'LeftUpLeg', 'LeftLeg', 'LeftArm', 'RightArm', 'Head'];

export class FootballerRig {
  constructor(template, { height = 1.8, kit = {}, skin = SKIN[0] } = {}) {
    const k = { shirt: 0xc8102e, shorts: 0x14161a, socks: 0xc8102e, boots: 0x0c0c0c, skin, ...kit };
    this.root = new THREE.Group();                       // position + heading (rotation.y: 0 faces −z)
    this.model = cloneSkinned(template.scene);
    this.model.rotation.y = Math.PI;                     // Mixamo faces +z
    this.root.add(this.model);
    this.model.updateMatrixWorld(true);
    paintKit(this.model, k);
    const box = new THREE.Box3().setFromObject(this.model); const nat = box.max.y - box.min.y;
    this.model.scale.setScalar(height / nat); this.model.position.y = -box.min.y * (height / nat);
    this.height = height;
    this.mixer = new THREE.AnimationMixer(this.model);
    const clip = (n) => template.animations.find((a) => a.name.toLowerCase() === n);
    this.act = {}; for (const n of ['idle', 'walk', 'run']) { const c = clip(n); if (c) { const a = this.mixer.clipAction(c); a.play(); a.setEffectiveWeight(n === 'idle' ? 1 : 0); this.act[n] = a; } }
    this.bones = {}; this.model.traverse((o) => { if (o.isBone) for (const n of BONES) if (o.name === 'mixamorig' + n || o.name === 'mixamorig:' + n) this.bones[n] = o; });
    this.base = {}; for (const n in this.bones) this.base[n] = { q: this.bones[n].quaternion.clone(), p: this.bones[n].position.clone() };
    this.speed = 0; this.lunge = 0; this.lean = 0; this.sway = 0; this.tilt = 0;
    // contact shadow
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.004; this.root.add(blob);
  }

  // speed (m/s) selects idle/walk/run and their playback rate (limits foot sliding).
  update(dt, speed, { lunge = 0, lean = 0, sway = 0 } = {}) {
    this.speed += (speed - this.speed) * Math.min(1, dt * 8);
    const s = this.speed, A = this.act;
    const wRun = THREE.MathUtils.smoothstep(s, 1.9, 2.8), wWalk = THREE.MathUtils.smoothstep(s, 0.15, 0.7) * (1 - wRun), wIdle = Math.max(0, 1 - wRun - wWalk);
    A.idle?.setEffectiveWeight(wIdle); A.walk?.setEffectiveWeight(wWalk); A.run?.setEffectiveWeight(wRun);
    A.walk?.setEffectiveTimeScale(THREE.MathUtils.clamp(s / 1.35, 0.5, 1.5));
    A.run?.setEffectiveTimeScale(THREE.MathUtils.clamp(s / 3.6, 0.7, 1.5));
    this.mixer.update(dt);
    this.lunge += (lunge - this.lunge) * Math.min(1, dt * 14);
    this.lean += (lean - this.lean) * Math.min(1, dt * 6);
    this.sway += (sway - this.sway) * Math.min(1, dt * 8);
    this._overlay();
  }

  _overlay() {
    const B = this.bones, u = this.lunge, l = this.lean, sw = this.sway;
    const add = (n, x = 0, y = 0, z = 0) => { const b = B[n]; if (!b) return; b.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z))); };
    if (l > 0.001) { add('Spine', 0.16 * l); add('Spine1', 0.14 * l); add('Spine2', 0.12 * l); }
    if (u > 0.001) {
      // driving leg reaches out for the ball, the other bends; the body drops and leans in
      add('RightUpLeg', -1.15 * u); add('RightLeg', 0.35 * u);
      add('LeftUpLeg', 0.55 * u); add('LeftLeg', -0.95 * u);
      add('Spine', 0.28 * u); add('Spine1', 0.2 * u);
      add('LeftArm', 0, 0, 0.5 * u); add('RightArm', 0, 0, -0.5 * u);
      if (B.Hips) B.Hips.position.y = this.base.Hips.p.y - 0.17 * u / (this.model.scale.x || 1);
    } else if (B.Hips) B.Hips.position.y = this.base.Hips.p.y;
    if (Math.abs(sw) > 0.001) { add('Spine', 0, 0, 0.35 * sw); add('Spine1', 0, 0, 0.3 * sw); add('Head', 0, 0, -0.2 * sw); }
  }
}
