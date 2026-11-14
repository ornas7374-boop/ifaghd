// Stage 3 — Three.js view aligned with the camera image.
// The 3D camera sits at the phone's lens (origin), tilted by the measured pitch, with the
// field of view of the visible (cover-cropped) part of the video. A transparent canvas is
// drawn over the <video>, so the room you see is the real camera image.
import * as THREE from 'three';
import { makePlayer, animatePlayer } from '../models.js';

export class MirrorView {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 60);
    this.world = new THREE.Group(); // floor-anchored content
    this.scene.add(this.world);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x8a7a68, 1.1);
    this.scene.add(this.hemi);
    // Key light from above and slightly in front (typical ceiling light). Direction is ASSUMED.
    this.sun = new THREE.DirectionalLight(0xffffff, 1.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.02;
    const sc = this.sun.shadow.camera; sc.left = -4; sc.right = 4; sc.top = 4; sc.bottom = -4; sc.near = 0.5; sc.far = 20;
    this.scene.add(this.sun, this.sun.target);

    // Shadow catcher: invisible floor that only shows shadows.
    this.catcher = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.35 }));
    this.catcher.rotation.x = -Math.PI / 2; this.catcher.receiveShadow = true;
    this.world.add(this.catcher);

    this._lc = document.createElement('canvas'); this._lc.width = 16; this._lc.height = 12;
    this._lx = this._lc.getContext('2d', { willReadFrequently: true });
    this._lumT = 0; this.lum = 0.5;
    this.frameMs = 0;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // Match the 3D camera to the estimator's intrinsics, the cover crop and the pitch.
  fit(floor, video) {
    const { tV } = floor.tans();
    const va = (video.videoWidth || 640) / (video.videoHeight || 480), ca = this.camera.aspect;
    const tVis = ca > va ? tV * (va / ca) : tV;
    this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(tVis));
    this.camera.position.set(0, 0, 0);
    this.camera.rotation.set(floor.pitch, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  setFloor(y) { this.world.position.y = y; }

  // Put the key light above/in front of a point (world coords, floor-relative).
  aimLight(x, z) {
    this.sun.position.set(x - 1.2, 3.2, z + 2.2);
    this.sun.target.position.set(x, this.world.position.y, z);
  }

  // Cheap light estimation from the camera image: brightness + colour cast. Direction unknown.
  updateLight(video, dt) {
    this._lumT -= dt; if (this._lumT > 0 || video.readyState < 2) return;
    this._lumT = 0.5;
    this._lx.drawImage(video, 0, 0, 16, 12);
    const d = this._lx.getImageData(0, 0, 16, 12).data;
    let r = 0, g = 0, b = 0; const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    r /= n * 255; g /= n * 255; b /= n * 255;
    this.lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const m = Math.max(r, g, b) || 1;
    const tint = new THREE.Color(0.7 + 0.3 * (r / m), 0.7 + 0.3 * (g / m), 0.7 + 0.3 * (b / m));
    const k = Math.max(0.3, Math.min(1.4, 0.35 + this.lum * 1.5));
    this.hemi.intensity = 1.1 * k; this.sun.intensity = 1.6 * k;
    this.hemi.color.copy(tint); this.sun.color.copy(tint);
  }

  render() {
    const t0 = performance.now();
    this.renderer.render(this.scene, this.camera);
    this.frameMs = this.frameMs * 0.9 + (performance.now() - t0) * 0.1;
  }
}

// A footballer scaled to a real height, standing on the floor, with a soft contact shadow.
export function makeLifeSizePlayer(heightM, kit = {}) {
  const p = makePlayer({ shirt: 0x1d5fd6, shorts: 0xffffff, socks: 0x1d5fd6, number: '10', ...kit });
  p.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  p.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(p);
  const natH = box.max.y - box.min.y;
  const holder = new THREE.Group();
  holder.add(p);
  p.position.y = -box.min.y;
  holder.scale.setScalar(heightM / natH);
  holder.userData.natH = natH; holder.userData.model = p;
  // contact shadow (ambient occlusion blob) — grounds the feet even where the light's shadow is weak
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 2, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.003;
  holder.add(blob); // scales with the holder → stays proportional to the player
  holder.userData.blob = blob;
  return holder;
}

export function idle(holder, dt, speed = 0, opts) {
  const u = holder.userData.model.userData;
  animatePlayer(holder.userData.model, speed, dt, opts);
  if (speed < 0.05) { // breathing idle
    u.body.position.y = Math.sin(performance.now() / 700) * 0.006;
    u.legs.forEach((L) => { L.thigh.rotation.x *= 0.85; L.shin.rotation.x = L.shin.rotation.x * 0.85 + 0.01; });
    u.arms.forEach((A) => { A.upper.rotation.x *= 0.85; });
  }
}

// Person occlusion: a full-screen pass that writes ONLY depth where the segmentation mask says
// "person", at the person's measured distance. Virtual objects behind you then fail the depth
// test there and the real camera image (you) shows through. Objects in front of you still draw.
// Limits: one flat depth for your whole body; mask edges are soft/laggy (~1 frame); other real
// objects (furniture, walls) are still NOT occluders.
export class PersonOccluder {
  constructor(view) {
    this.view = view;
    this.tex = new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RedFormat, THREE.UnsignedByteType);
    this.tex.minFilter = this.tex.magFilter = THREE.LinearFilter;
    this.mat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: { uMask: { value: this.tex }, uDepth: { value: 0.5 }, uScale: { value: new THREE.Vector2(1, 1) }, uOffset: { value: new THREE.Vector2(0, 0) } },
      vertexShader: `out vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `precision highp float; in vec2 vUv; uniform sampler2D uMask; uniform float uDepth; uniform vec2 uScale, uOffset; out vec4 o;
        void main(){
          // screen uv (0..1, y up) → mirrored video uv → raw mask uv (un-mirror x, flip y)
          vec2 s = vec2(vUv.x, 1.0 - vUv.y);
          vec2 v = uOffset + s * uScale;            // mirrored video coords 0..1
          if (v.x < 0.0 || v.x > 1.0 || v.y < 0.0 || v.y > 1.0) discard;
          float m = texture(uMask, vec2(1.0 - v.x, v.y)).r;
          if (m < 0.5) discard;
          gl_FragDepth = uDepth; o = vec4(0.0);
        }`,
      // NB: with depthTest off WebGL also skips depth writes → keep it on with ALWAYS
      colorWrite: false, depthWrite: true, depthTest: true, depthFunc: THREE.AlwaysDepth,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = -100;
    this.enabled = false; this.mesh.visible = false; this._ver = -1;
    view.scene.add(this.mesh);
  }

  // mask: {data,w,h,version}; distance: metres along the view axis to your body.
  update(mask, distance, video) {
    this.mesh.visible = this.enabled && !!mask;
    if (!this.mesh.visible) return;
    if (mask.version !== this._ver) {
      if (this.tex.image.width !== mask.w || this.tex.image.height !== mask.h) {
        this.tex.dispose();
        this.tex = new THREE.DataTexture(mask.data, mask.w, mask.h, THREE.RedFormat, THREE.UnsignedByteType);
        this.tex.minFilter = this.tex.magFilter = THREE.LinearFilter; this.tex.flipY = false; this.tex.unpackAlignment = 1;
        this.mat.uniforms.uMask.value = this.tex;
      } else this.tex.image.data = mask.data;
      this.tex.needsUpdate = true; this._ver = mask.version;
    }
    // object-fit: cover crop, as fractions of the video
    const W = innerWidth, H = innerHeight, vw = video.videoWidth || 640, vh = video.videoHeight || 480;
    const s = Math.max(W / vw, H / vh), fw = W / (vw * s), fh = H / (vh * s);
    this.mat.uniforms.uScale.value.set(fw, fh); this.mat.uniforms.uOffset.value.set((1 - fw) / 2, (1 - fh) / 2);
    // depth-buffer value of a point `distance` in front of the camera
    const cam = this.view.camera, n = cam.near, f = cam.far, z = Math.max(n * 1.01, distance);
    const ndc = (f + n) / (f - n) - (2 * f * n) / ((f - n) * z);
    this.mat.uniforms.uDepth.value = ndc * 0.5 + 0.5;
  }
}
