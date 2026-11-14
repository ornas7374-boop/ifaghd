// Defender POV v2 — hold the phone and MOVE. Realistic footballers attack you at once; a coach tunes
// the difficulty to you.
//
// Tracking: phone rotation = gyro (3DoF); walking = visual odometry on the floor (odometry.js);
// the floor height + your ball come from the real ball's apparent size (a size-5 ball is 22 cm).
import * as THREE from 'three';
import { FrontCamera, cameraErrorMessage } from '../mirror/camera.js';
import { MirrorView, makeLifeSizePlayer, idle } from '../mirror/view.js';
import { playKick } from '../models.js';
import { Sfx } from '../audio.js';
import { BallTracker, BALL_D } from '../defender/ball.js';
import { PhoneOrientation } from './orientation.js';
import { Odometry } from './odometry.js';
import { Press } from './press.js';
import { Coach } from './coach.js';
import { loadFootballerTemplate, FootballerRig } from './rig.js';

const $ = (s) => document.querySelector(s);
const show = (s, on = true) => ($(s).hidden = !on);
const store = { get(k, d) { try { const v = localStorage.getItem('pov.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('pov.' + k, JSON.stringify(v)); } catch { /* ignore */ } } };

const HFOV_BACK = 68;     // assumed FOV of the long side of the back camera (browsers do not expose it)
const BOX_BIAS = 1.15;    // detector box ÷ true ball width (measured on synthetic tests)
const ROUND = 120;
const S = { height: store.get('height', 170) };
const video = $('#cam');
const cam = new FrontCamera(video);
const orient = new PhoneOrientation();
const odo = new Odometry();
const ball = new BallTracker(video); ball.mirror = false; ball.every = 2;
const coach = new Coach();
const press = new Press(coach.level);
const sfx = new Sfx();
let view, camH = 1.2, camHFromBall = false;
let tplPromise = loadFootballerTemplate().catch((e) => { console.warn('GLB footballer unavailable, using the simple model', e); return null; });
let template = null; tplPromise.then((t) => (template = t));
const visuals = new Map();
let phase = 'start', stats = { drib: 0, loss: 0 }, timeLeft = ROUND;
let hd = { x: 0, z: -1 };      // direction you are going / looking (unit, floor plane)
let bw = null, bwT = 0, bv = { x: 0, z: 0 }, ballSeenAt = 0;   // ball in world space
const latHist = [];            // recent lateral ball velocity samples (for "cuts")
let hintT = 0;

// ---------- start screen ----------
const iH = $('#iH'); iH.value = S.height; const syncH = () => ($('#oH').textContent = `${iH.value} سم`); syncH();
iH.oninput = () => { S.height = +iH.value; store.set('height', S.height); syncH(); };
function refreshStart() {
  $('#lvlNow').textContent = coach.level.toFixed(1);
  $('#lvlInfo').textContent = coach.rounds ? `${coach.rounds} جولات • أفضل سلسلة ${coach.bestStreak}` : 'جولتك الأولى: نبدأ بمستوى سهل ونرفعه معك';
  $('#spark').innerHTML = coach.sparkline(220, 46);
}
refreshStart();

$('#bGo').onclick = async () => {
  $('#err').hidden = true;
  const oP = orient.start(); sfx.unlock();          // iOS: both must begin inside the tap
  try { await cam.start({ facing: 'environment', width: 960, height: 720 }); }
  catch (e) { $('#err').textContent = cameraErrorMessage(e); $('#err').hidden = false; return; }
  await oP;
  camH = S.height / 100 * 0.72;
  show('#start', false); show('#hud'); show('#chips');
  setup3D();
  await Promise.race([tplPromise, new Promise((r) => setTimeout(r, 3000))]);   // started loading at page load
  startRound();
  ball.load().catch((e) => { console.error(e); hint('تعذّر تحميل رصد الكرة. تحقق من الاتصال.'); });
  requestAnimationFrame(loop);
};
$('#bAgain').onclick = () => { show('#over', false); startRound(); };
$('#bHere').onclick = () => { orient.recenter(); press.reset(world()); flash('هجوم جديد', 'info', 800); };

function setup3D() {
  view = new MirrorView($('#gl'));
  view.world.position.y = -camH;
  addEventListener('resize', () => view.resize());
  view.ballRing = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.19, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x4fd88a, transparent: true, opacity: 0.8, depthWrite: false }));
  view.ballRing.visible = false; view.world.add(view.ballRing);
  view.ballOcc = new THREE.Mesh(new THREE.SphereGeometry(BALL_D / 2, 20, 14), new THREE.MeshBasicMaterial({ colorWrite: false }));
  view.ballOcc.renderOrder = -50; view.ballOcc.visible = false; view.world.add(view.ballOcc);
}

function startRound() {
  stats = { drib: 0, loss: 0 }; timeLeft = ROUND; coach.newSession(); press.setLevel(coach.level);
  for (const [, v] of visuals) view.world.remove(v.root); visuals.clear();
  press.reset(world()); phase = 'play'; sfx.whistle?.();
  hint(''); show('#over', false);
}
function endRound() {
  phase = 'over';
  for (const [, v] of visuals) v.root.visible = false;
  const s = coach.endSession();
  $('#oTitle').textContent = s.n === 0 ? 'جولة بدون مواجهات' : `تجاوزت ${s.beaten} من ${s.n} مواجهات`;
  const cell = (v, l, color = '') => `<div><b ${color ? `style="color:var(--${color})"` : ''}>${v}</b><span>${l}</span></div>`;
  $('#oRes').innerHTML = cell(s.beaten, 'مراوغات', 'good') + cell(s.lost, 'كرات ضائعة', 'bad') + cell(`${coach.level.toFixed(1)}`, s.levelTo >= s.levelFrom ? `مستواك ↑ (من ${s.levelFrom.toFixed(1)})` : `مستواك ↓ (من ${s.levelFrom.toFixed(1)})`);
  $('#oTips').innerHTML = (s.tips.length ? s.tips : ['استمر. كل جولة تعطيني بيانات أكثر لتطويرك.']).map((t) => `<div class="tip">${t}</div>`).join('');
  $('#oSpark').innerHTML = coach.sparkline(240, 54);
  show('#over'); refreshStart();
}

// ---------- world helpers ----------
const tans = () => {
  const vw = video.videoWidth || 4, vh = video.videoHeight || 3, a = vw / vh, tLong = Math.tan(THREE.MathUtils.degToRad(HFOV_BACK / 2));
  return a >= 1 ? { tH: tLong, tV: tLong / a } : { tH: tLong * a, tV: tLong };
};
function world() {
  const U = odo.pos;
  const seen = ball.seen && !!bw;
  return { user: { x: U.x, z: U.z }, f: hd, ball: seen ? { x: bw.x, z: bw.z, vx: bv.x, vz: bv.z, seen: true } : { x: U.x + hd.x * 1.0, z: U.z + hd.z * 1.0, vx: 0, vz: 0, seen: false } };
}
function flash(msg, kind = 'info', ms = 1200) { const el = $('#flash'); el.textContent = msg; el.className = `flash ${kind} show`; clearTimeout(flash.t); flash.t = setTimeout(() => el.classList.remove('show'), ms); }
function hint(msg, ms = 4000) { const el = $('#hintLine'); el.hidden = !msg; if (msg) { el.textContent = msg; clearTimeout(hint.t); hint.t = setTimeout(() => (el.hidden = true), ms); } }
function prompt(msg) { const el = $('#prompt'); el.hidden = !msg; if (msg) el.textContent = msg; }

// ball box → world position. The camera sits at (odo.pos, camH); rays use the gyro orientation.
function updateBall(now, q) {
  ball.update(null);
  const b = ball.box;
  if (!b || ball.lastSeen === updateBall.last) return;
  updateBall.last = ball.lastSeen;
  const { tH, tV } = tans(), vc = (b.top + b.bottom) / 2;
  const dir = new THREE.Vector3((b.cx - 0.5) * 2 * tH, -(vc - 0.5) * 2 * tV, -1).normalize();
  const half = Math.atan((b.w / BOX_BIAS) * tH);
  const dist = (BALL_D / 2) / Math.sin(half);
  if (!(dist > 0.25 && dist < 8)) return;
  const c = dir.multiplyScalar(dist).applyQuaternion(q);
  const edge = b.top < 0.01 || b.bottom > 0.99 || b.cx - b.w / 2 < 0.01 || b.cx + b.w / 2 > 0.99;
  if (!edge && b.score > 0.35) {
    const est = -(c.y - BALL_D / 2);
    if (est > 0.3 && est < 2.2) { camH += (est - camH) * (camHFromBall ? 0.1 : 0.6); camHFromBall = true; }
  }
  const p = { x: odo.pos.x + c.x, z: odo.pos.z + c.z };
  const dt = Math.max(0.03, now - bwT);
  if (bw && now - bwT < 0.6) {
    bv = { x: bv.x * 0.6 + ((p.x - bw.x) / dt) * 0.4, z: bv.z * 0.6 + ((p.z - bw.z) / dt) * 0.4 };
    bw = { x: bw.x + (p.x - bw.x) * 0.6, z: bw.z + (p.z - bw.z) * 0.6 };
  } else { bw = p; bv = { x: 0, z: 0 }; }
  bwT = now; ballSeenAt = now;
}

// number of lateral direction changes of your ball in the last 3 s (a measure of feints/cuts)
function cuts(now) {
  while (latHist.length && now - latHist[0].t > 3) latHist.shift();
  let n = 0, last = 0; for (const s of latHist) { if (Math.abs(s.v) < 0.55) continue; const sg = Math.sign(s.v); if (last && sg !== last) n++; last = sg; }
  return n;
}

// ---------- visuals for defenders ----------
function visualFor(agent) {
  let v = visuals.get(agent.id); if (v) return v;
  const skins = [0x8d5a3b, 0xc68c5f, 0xe0b48a, 0x6b4128];
  if (template) {
    const rig = new FootballerRig(template, { height: 1.74 + Math.random() * 0.12, skin: skins[agent.id % skins.length] });
    v = { root: rig.root, update(dt, a) { const u = a.state === 'lunge' ? Math.sin(Math.min(1, a.t / 0.45) * Math.PI) : 0; rig.update(dt, a.speed, { lunge: u, lean: a.state === 'charge' || a.state === 'jockey' || a.state === 'chase' ? 1 : 0, sway: a.state === 'chase' ? 0.4 : 0 }); } };
  } else {
    const h = makeLifeSizePlayer(1.8, { shirt: 0xc8102e, shorts: 0x111111, socks: 0xc8102e, skin: skins[agent.id % skins.length], number: String(2 + (agent.id % 8)) });
    v = { root: h, update(dt, a) { h.scale.setScalar(1.8 / h.userData.natH); idle(h, dt, a.speed * 2.2, { lean: a.state === 'lunge' ? 0.4 : undefined }); } };
  }
  view.world.add(v.root); visuals.set(agent.id, v); return v;
}

// ---------- loop ----------
let last = performance.now();
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now(), nowS = now / 1000, dt = Math.min(0.05, (now - last) / 1000), wdt = Math.min(0.25, (now - last) / 1000); last = now;
  // camera: visible FOV of the cover-cropped back-camera image + gyro rotation; position from odometry
  const vw = video.videoWidth || 4, vh = video.videoHeight || 3, va = vw / vh, ca = view.camera.aspect;
  const tLong = Math.tan(THREE.MathUtils.degToRad(HFOV_BACK / 2)), tV = va >= 1 ? tLong / va : tLong;
  view.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(ca > va ? tV * (va / ca) : tV)); view.camera.updateProjectionMatrix();
  orient.apply(view.camera);
  const q = view.camera.quaternion;

  // walking: floor odometry (needs the gyro; without it you count as standing still)
  if (orient.available && phase === 'play') {
    const { tH, tV: tv2 } = tans(), bb = ball.box;
    const skip = (u, v) => bb && ball.seen && Math.abs(u - bb.cx) < bb.w * 0.9 && v > bb.top - 0.04 && v < bb.bottom + 0.04;
    odo.step(video, q, camH, tH, tv2, skip, nowS);
  }
  view.camera.position.set(odo.pos.x, 0, odo.pos.z);
  view.setFloor(-camH);
  view.updateLight(video, dt);
  updateBall(nowS, q);

  // direction of travel (smoothed): your velocity when moving, else where you look
  const sp = Math.hypot(odo.vel.x, odo.vel.z), fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q), fl = Math.hypot(fwd.x, fwd.z) || 1;
  const tgt = sp > 0.5 ? { x: odo.vel.x / sp, z: odo.vel.z / sp } : { x: fwd.x / fl, z: fwd.z / fl };
  hd.x += (tgt.x - hd.x) * Math.min(1, dt * (sp > 0.5 ? 2.5 : 1.2)); hd.z += (tgt.z - hd.z) * Math.min(1, dt * (sp > 0.5 ? 2.5 : 1.2));
  const hl = Math.hypot(hd.x, hd.z) || 1; hd.x /= hl; hd.z /= hl;
  if (bw && bv) { const lx = -hd.z, lz = hd.x; latHist.push({ t: nowS, v: bv.x * lx + bv.z * lz }); if (latHist.length > 120) latHist.shift(); }

  const W = world();
  if (phase === 'play') {
    timeLeft -= wdt; if (timeLeft <= 0) endRound();
    for (const e of press.update(dt, nowS, W)) {
      const a = e.agent;
      if (e.type === 'lunge') { sfx.whoosh?.(); }
      if (e.type === 'miss') { flash('نجوت من التدخل!', 'good', 900); sfx.whoosh?.(); }
      if (e.type === 'foul') { stats.drib++; coach.record({ type: 'foul', ttb: a.age }); flash('خطأ على المدافع!', 'warn', 1300); sfx.whistle?.(); }
      if (e.type === 'beaten') { stats.drib++; coach.record({ type: 'beaten', ttb: a.age, cuts: cuts(nowS) }); flash('مراوغة ناجحة ✓', 'good', 1100); sfx.whoosh?.(); sfx.cheer?.(); press.setLevel(coach.level); }
      if (e.type === 'won') {
        stats.loss++; const ev = { type: 'won', how: e.how, exposed: e.exposed, ballDist: e.ballDist, cuts: cuts(nowS) };
        coach.record(ev); flash(e.how === 'block' ? 'المدافع صدّ الكرة!' : 'فقدت الكرة!', 'bad', 1500); sfx.tackle?.(); hint(coach.hintFor(ev), 4500); press.setLevel(coach.level);
      }
    }
  }

  // render defenders
  const live = new Set();
  if (phase === 'play') for (const a of press.agents) {
    live.add(a.id); const v = visualFor(a);
    v.root.visible = true; v.root.position.set(a.x, 0, a.z); v.root.rotation.y = a.facing; v.update(dt, a);
    if (a === press.agents[0]) view.aimLight(a.x, a.z);
  }
  for (const [id, v] of visuals) if (!live.has(id)) { view.world.remove(v.root); visuals.delete(id); }

  const seen = ball.seen && !!bw;
  view.ballRing.visible = seen && phase === 'play';
  view.ballOcc.visible = seen && phase === 'play' && press.agents.some((a) => (a.x - odo.pos.x) ** 2 + (a.z - odo.pos.z) ** 2 > (bw.x - odo.pos.x) ** 2 + (bw.z - odo.pos.z) ** 2);
  if (seen) { view.ballRing.position.set(bw.x, 0.004, bw.z); view.ballOcc.position.set(bw.x, BALL_D / 2, bw.z); }

  // off-screen hint toward the nearest attacker
  const a0 = press.agents.filter((a) => a.state !== 'chase')[0], ar = $('#arrow');
  if (a0 && phase === 'play') {
    view.camera.updateMatrixWorld();
    const pr = new THREE.Vector3(a0.x, 1.0 - camH, a0.z).project(view.camera);   // scene space: floor at y = −camH
    const off = pr.z > 1 || Math.abs(pr.x) > 1.05; ar.hidden = !off;
    if (off) { const left = pr.z > 1 ? true : pr.x < 0; ar.className = `arrow ${left ? 'l' : 'r'}`; ar.textContent = left ? '◀' : '▶'; }
  } else ar.hidden = true;

  // chips + messages
  const cb = $('#cBall'), cm = $('#cMove');
  cb.className = ball.det ? (seen ? 'ok' : 'no') : 'no'; cb.textContent = !ball.det ? 'الكرة: تحميل…' : seen ? 'الكرة ✓' : 'الكرة ✗';
  const slow = odo.stats.hz > 0 && odo.stats.hz < 10;
  const mv = !orient.available ? 'no' : odo.confidence > 0.5 && !slow ? 'ok' : 'no';
  cm.className = mv; cm.textContent = !orient.available ? 'المشي: بلا حساس' : slow ? 'المشي: الجهاز بطيء' : odo.confidence > 0.5 ? 'المشي ✓' : 'المشي: ضعيف';
  if (phase === 'play') {
    if (!orient.available && !loop.warnedGyro) { loop.warnedGyro = true; hint('لا يوجد حساس اتجاه: سأفترض أنك واقف.', 5000); }
    if (orient.available && ball.det && now - hintT > 9000) {
      if (odo.confidence < 0.2 && odo.stats.blocks > 0 && !loop.warnedFloor && now > 8000 + (loop.t0 ||= now)) { loop.warnedFloor = true; hint('الأرضية ما فيها نقوش كافية لتتبع مشيك. سأعتبرك أقرب للثبات. جرّب أرضية أو ضوءاً أفضل.', 6000); hintT = now; }
    }
    if (!seen && ball.det && nowS - ballSeenAt > 2.5) prompt('وجّه الكاميرا نحو كرتك'); else prompt('');
  }
  const tl = Math.max(0, Math.ceil(timeLeft));
  $('#hTime').textContent = `${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')}`;
  $('#hDrib').textContent = stats.drib; $('#hLoss').textContent = stats.loss; $('#hLvl').textContent = coach.level.toFixed(1);
  view.render();
}

window.__pov = { press, coach, odo, ball, orient, end: () => endRound(), start: () => startRound(), get camH() { return camH; }, get phase() { return phase; }, get stats() { return stats; }, get template() { return template; }, world };
