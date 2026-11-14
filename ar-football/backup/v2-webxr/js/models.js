// Procedural low-poly footballers and ball (no external assets → instant load, small download).
import * as THREE from 'three';

const geoCache = {};
const G = (key, make) => (geoCache[key] ||= make());

function limb(len, rTop, rBot, mat) {
  // Pivot at the top joint, limb hangs along -Y.
  const pivot = new THREE.Group();
  const m = new THREE.Mesh(G(`limb${len}${rTop}${rBot}`, () => {
    const g = new THREE.CylinderGeometry(rTop, rBot, len, 10, 1);
    g.translate(0, -len / 2, 0);
    return g;
  }), mat);
  m.castShadow = true;
  pivot.add(m);
  // rounded joint
  const j = new THREE.Mesh(G(`joint${rBot}`, () => new THREE.SphereGeometry(rBot, 10, 8)), mat);
  j.position.y = -len; j.castShadow = true;
  pivot.add(j);
  return pivot;
}

export function makePlayer({ shirt = 0x1f6fe0, shorts = 0xffffff, socks = 0x1f6fe0, skin = 0xc68c5f, hair = 0x1c140f, boots = 0x111111, number = '', numberColor = '#fff' } = {}) {
  const std = (c, r = 0.75) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 });
  const mShirt = std(shirt, 0.8), mShorts = std(shorts), mSocks = std(socks), mSkin = std(skin, 0.6), mHair = std(hair, 0.9), mBoot = std(boots, 0.4);

  const root = new THREE.Group();
  const body = new THREE.Group(); // bobbing/leaning part
  root.add(body);
  const hips = new THREE.Group(); hips.position.y = 0.95; body.add(hips);

  // pelvis / shorts
  const pelvis = new THREE.Mesh(G('pelvis', () => new THREE.CylinderGeometry(0.17, 0.19, 0.22, 12)), mShorts);
  pelvis.castShadow = true; hips.add(pelvis);

  // torso
  const torso = new THREE.Group(); torso.position.y = 0.1; hips.add(torso);
  const chest = new THREE.Mesh(G('chest', () => { const g = new THREE.CylinderGeometry(0.22, 0.17, 0.52, 14); g.translate(0, 0.26, 0); g.scale(1, 1, 0.66); return g; }), mShirt);
  chest.castShadow = true; torso.add(chest);
  if (number) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const x = c.getContext('2d'); x.fillStyle = numberColor; x.font = 'bold 44px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(number, 32, 34);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const back = new THREE.Mesh(G('numPlane', () => new THREE.PlaneGeometry(0.26, 0.26)), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    back.position.set(0, 0.3, 0.135); torso.add(back); // faces +z = back of the player (player faces -z)
  }
  // neck + head
  const neck = new THREE.Mesh(G('neck', () => new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8)), mSkin); neck.position.y = 0.56; torso.add(neck);
  const head = new THREE.Group(); head.position.y = 0.72; torso.add(head);
  const skull = new THREE.Mesh(G('head', () => { const g = new THREE.SphereGeometry(0.115, 16, 12); g.scale(0.92, 1.08, 1); return g; }), mSkin); skull.castShadow = true; head.add(skull);
  const hairM = new THREE.Mesh(G('hair', () => new THREE.SphereGeometry(0.122, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5)), mHair); hairM.position.y = 0.015; hairM.rotation.x = 0.25; head.add(hairM);

  // arms
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(0.25 * s, 0.47, 0); torso.add(sh);
    const sleeve = new THREE.Mesh(G('sleeve', () => new THREE.SphereGeometry(0.075, 10, 8)), mShirt); sh.add(sleeve);
    const upper = limb(0.28, 0.06, 0.05, mShirt); sh.add(upper);
    const fore = limb(0.26, 0.045, 0.038, mSkin); fore.position.y = -0.28; upper.add(fore);
    upper.rotation.z = 0.12 * s;
    arms.push({ upper, fore });
  }
  // legs
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(0.1 * s, -0.05, 0); hips.add(hip);
    const thigh = limb(0.44, 0.085, 0.065, mShorts); hip.add(thigh);
    const thighSkin = new THREE.Mesh(G('thighSkin', () => { const g = new THREE.CylinderGeometry(0.066, 0.062, 0.24, 10); g.translate(0, -0.32, 0); return g; }), mSkin);
    thigh.add(thighSkin);
    const shin = limb(0.44, 0.06, 0.045, mSocks); shin.position.y = -0.44; thigh.add(shin);
    const boot = new THREE.Mesh(G('boot', () => { const g = new THREE.BoxGeometry(0.1, 0.07, 0.25); g.translate(0, -0.035, -0.05); return g; }), mBoot);
    boot.position.y = -0.44; boot.castShadow = true; shin.add(boot);
    legs.push({ thigh, shin, boot });
  }

  root.userData = { body, hips, torso, head, arms, legs, phase: Math.random() * 6, kick: 0, kickSide: 1, lean: 0 };
  return root;
}

// speed in m/s; dt seconds. Procedural run cycle + kick pose.
export function animatePlayer(p, speed, dt, opts = {}) {
  const u = p.userData;
  const run = Math.min(1, speed / 6);
  u.phase += dt * (2.5 + speed * 1.55);
  const ph = u.phase;
  const swing = 0.15 + run * 0.85;
  for (let i = 0; i < 2; i++) {
    const a = Math.sin(ph + (i ? Math.PI : 0));
    const L = u.legs[i];
    L.thigh.rotation.x = -a * 0.75 * swing;
    L.shin.rotation.x = Math.max(0, Math.sin(ph + (i ? Math.PI : 0) - 1.2)) * 1.3 * swing + 0.05;
    const A = u.arms[i];
    A.upper.rotation.x = -Math.sin(ph + (i ? 0 : Math.PI)) * 0.65 * swing;
    A.fore.rotation.x = -0.4 - run * 0.7;
  }
  // kick override
  if (u.kick > 0) {
    u.kick = Math.max(0, u.kick - dt * 3.2);
    const k = Math.sin((1 - u.kick) * Math.PI);
    const L = u.legs[u.kickSide > 0 ? 1 : 0];
    L.thigh.rotation.x = -1.3 * k + 0.4 * (1 - k);
    L.shin.rotation.x = 0.2 * k;
  }
  u.body.position.y = Math.abs(Math.sin(ph)) * 0.05 * swing;
  u.lean += ((opts.lean ?? run * 0.18) - u.lean) * Math.min(1, dt * 6);
  u.hips.rotation.x = -u.lean;
  u.torso.rotation.z = (opts.tilt ?? 0) * 0.25;
  u.torso.rotation.y = Math.sin(ph) * 0.12 * swing;
}

export function playKick(p, side = 1) { p.userData.kick = 1; p.userData.kickSide = side; }

export function makeBall() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#f7f7f2'; x.fillRect(0, 0, 256, 128);
  // classic panel look on an equirect map
  x.fillStyle = '#16181c';
  const pts = [[32, 22], [96, 22], [160, 22], [224, 22], [0, 64], [64, 64], [128, 64], [192, 64], [256, 64], [32, 106], [96, 106], [160, 106], [224, 106]];
  for (const [px, py] of pts) {
    x.beginPath();
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 - Math.PI / 2; x.lineTo(px + Math.cos(a) * 13, py + Math.sin(a) * 11); }
    x.closePath(); x.fill();
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 }));
  ball.castShadow = true;
  return ball;
}
