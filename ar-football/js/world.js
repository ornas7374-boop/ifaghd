// Three.js world: renderer, pitch, goal, stadium, lights and the chase camera.
import * as THREE from 'three';
import { PITCH } from './config.js';

export class World {
  constructor(canvas) {
    const mobile = matchMedia('(pointer:coarse)').matches;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: true, powerPreference: 'high-performance' });
    this.maxDpr = mobile ? 1.25 : 1.5;
    this.dpr = Math.min(devicePixelRatio || 1, this.maxDpr);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.skyColor = new THREE.Color(0x0d1b2a);
    this.scene.background = this.skyColor;
    this.scene.fog = new THREE.Fog(0x0d1b2a, 70, 160);

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400);
    this.camera.position.set(0, 5, PITCH.startZ + 9);
    this.camTarget = new THREE.Vector3(0, 1, PITCH.startZ - 8);

    this._lights();
    this.ground = this._pitch();
    this.stadium = this._stadium();
    this.goal = this._goal();
    this.resize();
    addEventListener('resize', () => this.resize());
    this.frameTimes = []; this.quality = 2;
  }

  _lights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0xcfe3ff, 0x2a4a2a, 1.1));
    const sun = new THREE.DirectionalLight(0xfff3e0, 2.4);
    sun.position.set(-18, 34, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera; sc.left = -18; sc.right = 18; sc.top = 18; sc.bottom = -18; sc.near = 5; sc.far = 90;
    sun.shadow.bias = -0.0006;
    s.add(sun); s.add(sun.target);
    this.sun = sun;
  }

  _pitch() {
    // One canvas texture: mowing stripes + chalk lines. Cheap and crisp enough.
    const W = PITCH.halfWidth * 2 + 8, zMin = PITCH.goalZ - 8, zMax = PITCH.backZ + 6, Lm = zMax - zMin;
    const ppm = 16; // pixels per metre
    const c = document.createElement('canvas'); c.width = Math.round(W * ppm); c.height = Math.round(Lm * ppm);
    const x = c.getContext('2d');
    const toPx = (wx, wz) => [(wx + W / 2) * ppm, (wz - zMin) * ppm];
    for (let i = 0; i * 5 < Lm; i++) { x.fillStyle = i % 2 ? '#2f7d3f' : '#358a46'; x.fillRect(0, i * 5 * ppm, c.width, 5 * ppm); }
    // subtle noise
    const img = x.getImageData(0, 0, c.width, c.height), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    x.putImageData(img, 0, 0);
    x.strokeStyle = 'rgba(245,248,240,.92)'; x.lineWidth = 0.12 * ppm;
    const line = (pts) => { x.beginPath(); pts.forEach(([a, b], i) => { const [px, pz] = toPx(a, b); i ? x.lineTo(px, pz) : x.moveTo(px, pz); }); x.stroke(); };
    const hw = PITCH.halfWidth, gz = PITCH.goalZ;
    line([[-hw, PITCH.backZ], [-hw, gz], [hw, gz], [hw, PITCH.backZ]]);           // touchlines + goal line
    line([[-hw, PITCH.backZ - 0.01], [hw, PITCH.backZ - 0.01]]);                  // halfway-ish line behind start
    line([[-20.16, gz], [-20.16, gz + 16.5], [20.16, gz + 16.5], [20.16, gz]]);  // penalty box
    line([[-9.16, gz], [-9.16, gz + 5.5], [9.16, gz + 5.5], [9.16, gz]]);        // 6-yard box
    const [sx, sz] = toPx(0, gz + 11); x.fillStyle = 'rgba(245,248,240,.92)'; x.beginPath(); x.arc(sx, sz, 0.2 * ppm, 0, 7); x.fill();
    // D arc
    const [ax, az] = toPx(0, gz + 11); x.beginPath(); x.arc(ax, az, 9.15 * ppm, Math.PI * 0.2, Math.PI * 0.8); x.stroke();
    // centre circle (start spot area)
    const [cx, cz] = toPx(0, PITCH.backZ); x.beginPath(); x.arc(cx, cz, 9.15 * ppm, Math.PI, Math.PI * 2); x.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, transparent: true, opacity: 1 });
    const g = new THREE.Mesh(new THREE.PlaneGeometry(W, Lm), mat);
    g.rotation.x = -Math.PI / 2; g.position.set(0, 0, (zMin + zMax) / 2);
    g.receiveShadow = true;
    this.scene.add(g);
    // surround grass
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ color: 0x2a6b37, roughness: 1 }));
    outer.rotation.x = -Math.PI / 2; outer.position.set(0, -0.02, (zMin + zMax) / 2); outer.receiveShadow = true;
    this.scene.add(outer);
    this.outerGround = outer;
    return g;
  }

  _goal() {
    const grp = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const r = 0.06, hw = PITCH.goalHalfWidth, h = PITCH.goalHeight, depth = 2;
    const post = new THREE.CylinderGeometry(r, r, h, 10);
    for (const s of [-1, 1]) { const p = new THREE.Mesh(post, white); p.position.set(s * hw, h / 2, 0); p.castShadow = true; grp.add(p); }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(r, r, hw * 2 + r * 2, 10), white);
    bar.rotation.z = Math.PI / 2; bar.position.y = h; bar.castShadow = true; grp.add(bar);
    // net as line grid
    const pts = [];
    const step = 0.25;
    for (let xx = -hw; xx <= hw + 1e-6; xx += step) { pts.push(xx, h, 0, xx, h * 0.8, -depth, xx, h * 0.8, -depth, xx, 0, -depth); }
    for (let yy = 0; yy <= h + 1e-6; yy += step) { const zz = -depth; pts.push(-hw, Math.min(yy, h * 0.8), zz, hw, Math.min(yy, h * 0.8), zz); }
    for (const s of [-1, 1]) {
      for (let zz = 0; zz >= -depth; zz -= step) pts.push(s * hw, 0, zz, s * hw, h + (h * 0.8 - h) * (-zz / depth), zz);
      for (let yy = 0; yy <= h; yy += step) pts.push(s * hw, yy, 0, s * hw, Math.min(yy, h * 0.8), -depth);
    }
    for (let zz = 0; zz >= -depth; zz -= step) { const yy = h + (h * 0.8 - h) * (-zz / depth); pts.push(-hw, yy, zz, hw, yy, zz); }
    const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    grp.add(new THREE.LineSegments(ng, new THREE.LineBasicMaterial({ color: 0xe8ece8, transparent: true, opacity: 0.55 })));
    grp.position.z = PITCH.goalZ;
    this.scene.add(grp);
    return grp;
  }

  _stadium() {
    const grp = new THREE.Group();
    // crowd texture
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const x = c.getContext('2d'); x.fillStyle = '#141b26'; x.fillRect(0, 0, 512, 128);
    // seat rows + spectators (muted so the pitch stays the focus)
    for (let r = 0; r < 128; r += 8) { x.fillStyle = 'rgba(255,255,255,.04)'; x.fillRect(0, r, 512, 1); }
    const cols = ['#8e2b23', '#b9c0c4', '#24557d', '#a88a1c', '#2f6b45', '#9a5a22', '#5d3a73', '#7d8589'];
    for (let i = 0; i < 1700; i++) { x.globalAlpha = 0.55 + Math.random() * 0.35; x.fillStyle = cols[(Math.random() * cols.length) | 0]; x.fillRect(Math.random() * 512, Math.random() * 128, 3, 4); }
    x.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const standMat = (rep) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rep, 3); return new THREE.MeshStandardMaterial({ map: t, roughness: 1 }); };
    const mk = (w, ang, px, pz, ry) => {
      const geo = new THREE.PlaneGeometry(w, 22);
      const m = new THREE.Mesh(geo, standMat(w / 18));
      m.position.set(px, 9, pz); m.rotation.y = ry; m.rotateX(-ang);
      grp.add(m);
    };
    const hw = PITCH.halfWidth, zc = (PITCH.goalZ + PITCH.backZ) / 2, len = PITCH.backZ - PITCH.goalZ + 40;
    mk(len, 0.6, -hw - 14, zc, Math.PI / 2);
    mk(len, 0.6, hw + 14, zc, -Math.PI / 2);
    mk(hw * 2 + 30, 0.6, 0, PITCH.goalZ - 20, 0);
    // ad boards
    const adC = document.createElement('canvas'); adC.width = 512; adC.height = 32;
    const ax = adC.getContext('2d');
    const ads = ['AR DEFENDER', 'PLAY • MOVE • DRIBBLE', 'BODY CONTROL', 'BEAT THEM ALL'];
    for (let i = 0; i < 4; i++) { ax.fillStyle = ['#0b5394', '#cc0000', '#e69138', '#274e13'][i]; ax.fillRect(i * 128, 0, 128, 32); ax.fillStyle = '#fff'; ax.font = 'bold 13px system-ui'; ax.textAlign = 'center'; ax.fillText(ads[i], i * 128 + 64, 21); }
    const adT = new THREE.CanvasTexture(adC); adT.colorSpace = THREE.SRGBColorSpace; adT.wrapS = THREE.RepeatWrapping;
    const board = (w, px, pz, ry) => {
      const t = adT.clone(); t.needsUpdate = true; t.repeat.set(w / 24, 1);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.9), new THREE.MeshBasicMaterial({ map: t }));
      m.position.set(px, 0.45, pz); m.rotation.y = ry; grp.add(m);
    };
    board(len - 30, -hw - 3, zc, Math.PI / 2);
    board(len - 30, hw + 3, zc, -Math.PI / 2);
    board(hw * 2 + 6, 0, PITCH.goalZ - 5, 0);
    // floodlights
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.5, roughness: 0.4 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfffbe6 });
    for (const [px, pz] of [[-hw - 20, PITCH.goalZ - 12], [hw + 20, PITCH.goalZ - 12], [-hw - 20, PITCH.backZ + 10], [hw + 20, PITCH.backZ + 10]]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 34, 8), poleMat); p.position.set(px, 17, pz); grp.add(p);
      const l = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 0.6), lampMat); l.position.set(px, 34, pz); l.lookAt(0, 0, (PITCH.goalZ + PITCH.backZ) / 2); grp.add(l);
    }
    this.scene.add(grp);
    return grp;
  }

  setAR(on) {
    this.ar = on;
    this.stadium.visible = !on;
    this.outerGround.visible = !on;
    this.scene.background = on ? null : this.skyColor;
    this.scene.fog = on ? null : new THREE.Fog(0x0d1b2a, 70, 160);
    this.ground.material.opacity = on ? 0.62 : 1;
    this.renderer.setClearColor(0x000000, on ? 0 : 1);
  }

  resize() {
    const c = this.renderer.domElement;
    const w = c.clientWidth || innerWidth, h = c.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 72 : 58; // portrait phones see more
    this.camera.updateProjectionMatrix();
  }

  // Chase camera behind the attacker, looking down the pitch.
  follow(target, ballPos, dt) {
    const back = this.camera.aspect < 0.8 ? 9.5 : 7.6, up = this.camera.aspect < 0.8 ? 7 : 4.3;
    const desired = new THREE.Vector3(target.x * 0.8, up, target.z + back);
    const k = 1 - Math.exp(-dt * 5);
    this.camera.position.lerp(desired, k);
    const portrait = this.camera.aspect < 0.8;
    const look = new THREE.Vector3((target.x + ballPos.x) / 2 * 0.9, portrait ? 0 : 0.8, Math.min(target.z, ballPos.z) - (portrait ? 7 : 9));
    this.camTarget.lerp(look, k);
    this.camera.lookAt(this.camTarget);
    this.sun.position.set(target.x - 18, 34, target.z + 14);
    this.sun.target.position.set(target.x, 0, target.z - 4);
  }

  // Adaptive quality: drop resolution, then shadows, if frames are slow.
  adapt(dt) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 90) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    if (avg > 1 / 40 && this.quality > 0) {
      this.quality--;
      if (this.quality === 1) { this.dpr = 1; this.renderer.setPixelRatio(1); this.resize(); }
      if (this.quality === 0) { this.renderer.shadowMap.enabled = false; this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); }
    }
  }

  render() { this.renderer.render(this.scene, this.camera); }
}
