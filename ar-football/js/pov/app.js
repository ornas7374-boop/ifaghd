// Defender POV: hold the phone (back camera). A life-size defender appears in front of you as soon
// as the camera opens; you dribble your REAL ball past him while looking through the screen.
//
// Tracking: phone ROTATION from the gyro (3DoF). The floor comes from your ball: a size-5 ball is
// 22 cm wide, so its size in the image gives its distance → its height → the floor. Until the ball
// is seen, the floor is assumed at ~0.72 × your height below the phone.
import * as THREE from 'three';
import { FrontCamera, cameraErrorMessage } from '../mirror/camera.js';
import { MirrorView, makeLifeSizePlayer, idle } from '../mirror/view.js';
import { playKick } from '../models.js';
import { Sfx } from '../audio.js';
import { BallTracker, BALL_D } from '../defender/ball.js';
import { Duel } from '../defender/duel.js';
import { PhoneOrientation } from './orientation.js';

const $ = (s) => document.querySelector(s);
const show = (s, on = true) => ($(s).hidden = !on);
const store = { get(k, d) { try { const v = localStorage.getItem('pov.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('pov.' + k, JSON.stringify(v)); } catch { /* ignore */ } } };

const HFOV_BACK = 68;          // assumed horizontal FOV (long side) of a phone's main back camera
const BOX_BIAS = 1.15;         // detector box width ÷ true ball width (from synthetic tests)
const S = { level: store.get('level', 'medium'), height: store.get('height', 1.7), roundSec: 120 };
const video = $('#cam');
const cam = new FrontCamera(video);
const orient = new PhoneOrientation();
const ball = new BallTracker(video); ball.mirror = false; ball.every = 1;
const duel = new Duel(S.level);
const sfx = new Sfx();
let view, defender, ballRing, ballOcc;
let camH = S.height * 0.72;   // phone height above the floor (refined from the ball)
let camHFromBall = false;
let phase = 'start', stats = { drib: 0, loss: 0, foul: 0 }, timeLeft = S.roundSec;
let axisYaw = 0;              // duel "forward" heading (world yaw) chosen when the defender spawns
let ballW = null, ballV = { x: 0, z: 0 }, lastBoxT = 0, respawnAt = 0;

// ---------- start ----------
const lv = document.querySelectorAll('#lvl button');
const syncL = () => lv.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.d === S.level)));
lv.forEach((b) => (b.onclick = () => { S.level = b.dataset.d; store.set('level', S.level); syncL(); })); syncL();

$('#bGo').onclick = async () => {
  $('#err').hidden = true;
  const oP = orient.start(); sfx.unlock();           // both must begin inside the tap on iOS
  try { await cam.start({ facing: 'environment', width: 960, height: 720 }); }
  catch (e) { $('#err').textContent = cameraErrorMessage(e); $('#err').hidden = false; return; }
  await oP;
  show('#start', false); show('#hud');
  setup3D();
  // The defender appears right away; ball detection loads in the background.
  phase = 'play'; spawn(); sfx.whistle?.();
  ball.load().catch((e) => { console.error(e); prompt('تعذّر تحميل رصد الكرة — تحقق من الاتصال.'); });
  requestAnimationFrame(loop);
};

function setup3D() {
  view = new MirrorView($('#gl'));
  defender = makeLifeSizePlayer(1.8, { shirt: 0xc8102e, shorts: 0x111111, socks: 0xc8102e, skin: 0x8d5a3b, number: '4' });
  view.world.add(defender);
  ballRing = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.19, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x4fd88a, transparent: true, opacity: 0.8, depthWrite: false }));
  ballRing.visible = false; view.world.add(ballRing);
  ballOcc = new THREE.Mesh(new THREE.SphereGeometry(BALL_D / 2, 20, 14), new THREE.MeshBasicMaterial({ colorWrite: false }));
  ballOcc.renderOrder = -50; ballOcc.visible = false; view.world.add(ballOcc);
  addEventListener('resize', () => view.resize());
}

// ---------- coordinates ----------
// World: phone at the origin, y up, floor at y = -camH. Duel space: the attack axis rotated so the
// duel's "goal" (z=0) lies 12 m ahead of you along axisYaw, and you attack toward it.
const GOAL = 12;
function toDuel(p) {
  const c = Math.cos(-axisYaw), s = Math.sin(-axisYaw);
  const x = p.x * c + p.z * s, z = -p.x * s + p.z * c; // rotate so axisYaw → −z
  return { x, z: -GOAL - z }; // z' = −12 at you, 0 at the goal
}
function fromDuel(d) {
  const z = -GOAL - d.z, x = d.x;
  const c = Math.cos(axisYaw), s = Math.sin(axisYaw);
  return { x: x * c + z * s, z: -x * s + z * c };
}
function camForwardYaw() {
  const f = new THREE.Vector3(0, 0, -1).applyQuaternion(view.camera.quaternion);
  return Math.atan2(-f.x, -f.z);
}
function spawn() {
  axisYaw = view ? camForwardYaw() : 0;
  // 2.4 m in front of you (or 1.3 m beyond your ball, if seen)
  const start = ballW ? toDuel(ballW) : { x: 0, z: -GOAL + 0.6 };
  duel.minCamZ = -1; // goal is far away; keep the duel's own clamp out of the way
  duel.setLevel(S.level);
  duel.reset({ x: start.x, z: start.z });
  duel.z = Math.max(duel.z, -GOAL + 2.2); duel.x = start.x;
  duel.cool = 2.5; // grace: no tackle in the first 2.5 s after he appears
  defender.visible = true; respawnAt = 0;
}

function flash(msg, kind = 'info', ms = 1200) {
  const el = $('#flash'); el.textContent = msg; el.className = `flash ${kind} show`;
  clearTimeout(flash.t); flash.t = setTimeout(() => el.classList.remove('show'), ms);
}
function prompt(msg) { const el = $('#prompt'); el.hidden = !msg; if (msg) el.textContent = msg; }
$('#bHere').onclick = () => { orient.recenter(); spawn(); flash('المدافع أمامك', 'info', 900); };

// ---------- ball: box → 3D ----------
function updateBall(now) {
  ball.update(null);
  const b = ball.box;
  if (!b || ball.lastSeen === lastBoxT) return;
  lastBoxT = ball.lastSeen;
  const vw = video.videoWidth || 4, vh = video.videoHeight || 3, a = vw / vh;
  const tLong = Math.tan(THREE.MathUtils.degToRad(HFOV_BACK / 2));
  const tH = a >= 1 ? tLong : tLong * a, tV = a >= 1 ? tLong / a : tLong;
  const vc = (b.top + b.bottom) / 2;
  const dir = new THREE.Vector3((b.cx - 0.5) * 2 * tH, -(vc - 0.5) * 2 * tV, -1).normalize();
  // detector boxes run ~15% wider than the ball itself (measured: box/ball 1.07–1.39) → correct the size
  const half = Math.atan((b.w / BOX_BIAS) * tH);           // angular radius
  const dist = (BALL_D / 2) / Math.sin(half);
  if (!(dist > 0.25 && dist < 8)) return;
  const c = dir.multiplyScalar(dist).applyQuaternion(view.camera.quaternion);
  const edge = b.top < 0.01 || b.bottom > 0.99 || b.cx - b.w / 2 < 0.01 || b.cx + b.w / 2 > 0.99;
  // the ball's height tells us where the floor is (ignore boxes cut by the frame edge)
  if (!edge && b.score > 0.35) {
    const est = -(c.y - BALL_D / 2);
    if (est > 0.3 && est < 2.2) { camH += (est - camH) * (camHFromBall ? 0.12 : 0.6); camHFromBall = true; }
  }
  const p = { x: c.x, z: c.z };
  if (ballW) {
    const dt = Math.max(0.03, (now - (updateBall.t || now)) / 1000);
    ballV = { x: ballV.x * 0.6 + ((p.x - ballW.x) / dt) * 0.4, z: ballV.z * 0.6 + ((p.z - ballW.z) / dt) * 0.4 };
    ballW = { x: ballW.x + (p.x - ballW.x) * 0.6, z: ballW.z + (p.z - ballW.z) * 0.6 };
  } else ballW = p;
  updateBall.t = now;
}

// ---------- loop ----------
let last = performance.now();
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000), wdt = Math.min(0.25, (now - last) / 1000); last = now;
  // camera: FOV of the visible (cover-cropped) part of the back camera image + gyro rotation
  const vw = video.videoWidth || 4, vh = video.videoHeight || 3, va = vw / vh, ca = view.camera.aspect;
  const tLong = Math.tan(THREE.MathUtils.degToRad(HFOV_BACK / 2)), tV = va >= 1 ? tLong / va : tLong;
  view.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(ca > va ? tV * (va / ca) : tV));
  view.camera.position.set(0, 0, 0); view.camera.updateProjectionMatrix();
  orient.apply(view.camera);
  view.setFloor(-camH);
  view.updateLight(video, dt);
  updateBall(now);
  const seen = ball.seen && !!ballW;

  if (phase === 'play') {
    timeLeft -= wdt;
    if (timeLeft <= 0) { phase = 'over'; defender.visible = false; flash(`انتهت: ${stats.drib} مراوغات / ${stats.loss} ضائعة`, 'info', 6000); }
    if (!ball.det) prompt('جاري تحميل رصد الكرة…');
    else if (!seen) prompt('وجّه الكاميرا نحو كرتك عند قدميك');
    else if (!camHFromBall) prompt('');
    else prompt('');
    if (respawnAt && now > respawnAt) spawn();
    if (!respawnAt) {
      // ball in duel space; without a ball he still steps up to you
      const bd = seen ? toDuel(ballW) : { x: 0, z: -GOAL + 0.6 };
      const c = Math.cos(-axisYaw), s = Math.sin(-axisYaw);
      const vd = seen ? { x: ballV.x * c + ballV.z * s, z: -(-ballV.x * s + ballV.z * c) } : { x: 0, z: 0 };
      const you = { x: 0, z: -GOAL }; // you are at the phone
      for (const e of duel.update(dt, now / 1000, { x: bd.x, z: bd.z, vx: vd.x, vz: vd.z, seen }, you)) {
        if (e.type === 'lunge') playKick(defender.userData.model, 1);
        if (e.type === 'won') { stats.loss++; flash(e.how === 'block' ? 'المدافع صدّ الكرة!' : 'فقدت الكرة!', 'bad', 1500); sfx.tackle?.(); respawnAt = now + 1700; }
        if (e.type === 'foul') { stats.foul++; flash('خطأ على المدافع!', 'warn', 1400); sfx.whistle?.(); }
        if (e.type === 'miss') { flash('نجوت من التدخل!', 'good', 900); sfx.whoosh?.(); }
        if (e.type === 'beaten') { stats.drib++; flash('مراوغة ناجحة ✓', 'good', 1400); sfx.whoosh?.(); sfx.cheer?.(); respawnAt = now + 1600; }
      }
      // never closer than 0.8 m to you
      const w = fromDuel(duel); const r = Math.hypot(w.x, w.z);
      if (r < 0.8) { const k = 0.8 / (r || 1); const d2 = toDuel({ x: w.x * k, z: w.z * k }); duel.x = d2.x; duel.z = d2.z; }
    }
  }

  // draw the defender in world space
  if (defender.visible) {
    const w = fromDuel(duel);
    defender.scale.setScalar(1.8 / defender.userData.natH);
    defender.position.set(w.x, 0, w.z);
    const target = seen ? ballW : { x: 0, z: 0 };
    defender.rotation.y = Math.atan2(-(target.x - w.x), -(target.z - w.z));
    const st = duel.state;
    idle(defender, dt, duel.speed * 2.2, { lean: st === 'lunge' ? 0.35 : st === 'jockey' ? 0.12 : 0, tilt: st === 'beaten' ? 1.5 : 0 });
    view.aimLight(w.x, w.z);
    // off-screen hint
    const p = defender.position.clone().add(new THREE.Vector3(0, -camH + 1, 0)).project(view.camera);
    const behind = p.z > 1, off = behind || Math.abs(p.x) > 1.05;
    const ar = $('#arrow'); ar.hidden = !off;
    if (off) { const left = behind ? true : p.x < 0; ar.className = `arrow ${left ? 'l' : 'r'}`; ar.textContent = left ? '◀' : '▶'; }
  }
  ballRing.visible = seen; ballOcc.visible = seen && defender.visible;
  if (seen) { ballRing.position.set(ballW.x, 0.004, ballW.z); ballOcc.position.set(ballW.x, BALL_D / 2, ballW.z); ballRing.material.color.setHex(duel.state === 'lunge' ? 0xff5a5a : 0x4fd88a); }

  const tl = Math.max(0, Math.ceil(timeLeft));
  $('#hTime').textContent = `${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')}`;
  $('#hDrib').textContent = stats.drib; $('#hLoss').textContent = stats.loss; $('#hFoul').textContent = stats.foul;
  view.render();
}

window.__pov = { duel, ball, orient, get camH() { return camH; }, get ballW() { return ballW; }, get phase() { return phase; }, get stats() { return stats; }, fromDuel, toDuel };
