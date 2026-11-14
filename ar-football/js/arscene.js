// Three.js scene for AR: transparent background, an "arena" group that the AR layer anchors
// to the real floor, a shadow-catcher plane so players cast shadows on the real ground,
// and lighting that can be driven by real-world light estimation.
import * as THREE from 'three';
import { PITCH } from './config.js';

export class ARScene {
  constructor(canvas) {
    const mobile = matchMedia('(pointer:coarse)').matches;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.xr.enabled = true;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.05, 100);

    // Everything gameplay-related lives in the arena (arena-local metres).
    this.arena = new THREE.Group();
    this.arena.matrixAutoUpdate = false;
    this.arena.visible = false;
    this.scene.add(this.arena);
    this.arenaScale = 1;

    this._lights();
    this._shadowCatcher();
    this.field = this._field();
    this.goal = this._goal();
    this._cones();
    this.reticle = this._reticle();

    this.resize();
    addEventListener('resize', () => this.resize());
  }

  _lights() {
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x888877, 1.2);
    this.scene.add(this.hemi);
    // Shadow light lives inside the arena so it follows placement/scale.
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(-2.5, 7, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    this.arena.add(sun); this.arena.add(sun.target);
    this.sun = sun;
    this.baseHemi = 1.2; this.baseSun = 1.8;
  }

  _shadowCatcher() {
    // Invisible plane that only shows shadows → players look grounded on the real floor.
    const m = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShadowMaterial({ opacity: 0.38 }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.002; m.receiveShadow = true;
    this.arena.add(m);
    this.shadowCatcher = m;
  }

  _field() {
    // Painted lines (and an optional faint turf tint) on a transparent canvas.
    const W = PITCH.halfWidth * 2 + 0.6, L = PITCH.backZ - PITCH.goalZ + 0.6, ppm = 96;
    const c = document.createElement('canvas'); c.width = Math.round(W * ppm); c.height = Math.round(L * ppm);
    const x = c.getContext('2d');
    const zMin = PITCH.goalZ - 0.3;
    const P = (wx, wz) => [(wx + W / 2) * ppm, (wz - zMin) * ppm];
    x.fillStyle = 'rgba(46,140,70,0.28)';
    const [ax, az] = P(-PITCH.halfWidth, PITCH.goalZ), [bx, bz] = P(PITCH.halfWidth, PITCH.backZ);
    x.fillRect(ax, az, bx - ax, bz - az);
    x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 0.05 * ppm;
    x.strokeRect(ax, az, bx - ax, bz - az);
    const line = (pts) => { x.beginPath(); pts.forEach(([p, q], i) => { const [u, v] = P(p, q); i ? x.lineTo(u, v) : x.moveTo(u, v); }); x.stroke(); };
    const g = PITCH.goalZ, bw = PITCH.goalHalfWidth + 0.8;
    line([[-bw, g], [-bw, g + 1.6], [bw, g + 1.6], [bw, g]]);
    const [sx, sz] = P(0, PITCH.startZ); x.fillStyle = '#fff'; x.beginPath(); x.arc(sx, sz, 0.06 * ppm, 0, 7); x.fill();
    x.beginPath(); x.arc(sx, sz, 0.9 * ppm, Math.PI, Math.PI * 2); x.stroke();
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(0, 0.004, (PITCH.goalZ + PITCH.backZ) / 2);
    m.renderOrder = -1;
    this.arena.add(m);
    return m;
  }

  _goal() {
    const grp = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
    const r = 0.035, hw = PITCH.goalHalfWidth, h = PITCH.goalHeight, depth = 0.6;
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 10), white); p.position.set(s * hw, h / 2, 0); p.castShadow = true; grp.add(p);
      const back = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r * 0.7, depth, 8), white); back.rotation.x = Math.PI / 2; back.position.set(s * hw, r, -depth / 2); grp.add(back);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(r, r, hw * 2 + r * 2, 10), white);
    bar.rotation.z = Math.PI / 2; bar.position.y = h; bar.castShadow = true; grp.add(bar);
    const pts = [], step = 0.12;
    for (let xx = -hw; xx <= hw + 1e-6; xx += step) pts.push(xx, h, 0, xx, 0, -depth);
    for (let t = 0; t <= 1.0001; t += step / h) { const yy = h * t, zz = -depth * (1 - t); pts.push(-hw, yy, zz, hw, yy, zz); }
    for (const s of [-1, 1]) for (let t = 0; t <= 1.0001; t += 0.15) pts.push(s * hw, h * t, -depth * (1 - t), s * hw, 0, -depth * (1 - t));
    const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    grp.add(new THREE.LineSegments(ng, new THREE.LineBasicMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.6 })));
    grp.position.z = PITCH.goalZ;
    this.arena.add(grp);
    return grp;
  }

  _cones() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6 });
    const geo = new THREE.ConeGeometry(0.08, 0.2, 14); geo.translate(0, 0.1, 0);
    const hw = PITCH.halfWidth;
    for (const [x, z] of [[-hw, PITCH.backZ], [hw, PITCH.backZ], [-hw, PITCH.goalZ], [hw, PITCH.goalZ], [-hw, 0], [hw, 0]]) {
      const c = new THREE.Mesh(geo, mat); c.position.set(x, 0, z); c.castShadow = true; this.arena.add(c);
    }
  }

  _reticle() {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.15, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.025, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3fa7ff }));
    g.add(ring, dot);
    // footprint preview of the arena at the current scale
    const fp = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(PITCH.halfWidth * 2, PITCH.backZ - PITCH.goalZ).rotateX(-Math.PI / 2)),
      new THREE.LineBasicMaterial({ color: 0x3fa7ff, transparent: true, opacity: 0.7 }));
    fp.position.z = (PITCH.backZ + PITCH.goalZ) / 2; // arena centre (arena-local)
    g.add(fp); g.userData.footprint = fp;
    g.matrixAutoUpdate = false; g.visible = false;
    this.scene.add(g);
    return g;
  }

  // Place the arena: world position, yaw (radians) and uniform scale.
  setArenaTransform(pos, yaw, scale) {
    this.arenaPos = pos.clone(); this.arenaYaw = yaw; this.arenaScale = scale;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    this.arena.matrix.compose(pos, q, new THREE.Vector3(scale, scale, scale));
    this.arena.matrixWorldNeedsUpdate = true;
    this.arena.visible = true;
    // Shadow frustum is in world units → resize with the arena scale.
    const sc = this.sun.shadow.camera, e = 6.5 * scale;
    sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.near = 0.5 * scale; sc.far = 20 * scale;
    sc.updateProjectionMatrix();
  }

  // Real-world light: brightness 0..1 and optional colour → scale our lights.
  setAmbient(brightness, color) {
    const b = Math.max(0.25, Math.min(1.4, brightness));
    this.hemi.intensity = this.baseHemi * b;
    this.sun.intensity = this.baseSun * b;
    if (color) { this.hemi.color.copy(color); this.sun.color.copy(color); }
  }

  resize() {
    const c = this.renderer.domElement;
    if (this.renderer.xr.isPresenting) return;
    const w = c.clientWidth || innerWidth, h = c.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.onResize?.(w, h);
  }

  render() { this.renderer.render(this.scene, this.camera); }
}
