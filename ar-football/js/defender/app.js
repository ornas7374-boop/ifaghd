// Real Ball Defender: a life-size virtual defender standing in your room (front camera, phone on
// a stand) who tries to take YOUR real ball. You dribble toward the phone to beat him.
import * as THREE from 'three';
import { FrontCamera, cameraErrorMessage } from '../mirror/camera.js';
import { FloorEstimator, TiltSensor } from '../mirror/floor.js';
import { MirrorView, makeLifeSizePlayer, idle, PersonOccluder } from '../mirror/view.js';
import { PoseTracker } from '../pose.js';
import { playKick } from '../models.js';
import { Sfx } from '../audio.js';
import { BallTracker, BALL_D } from './ball.js';
import { Duel } from './duel.js';

const $ = (s) => document.querySelector(s);
const show = (s, on = true) => ($(s).hidden = !on);
const store = { get(k, d) { try { const v = localStorage.getItem('rbd.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('rbd.' + k, JSON.stringify(v)); } catch { /* ignore */ } } };

const S = { height: store.get('height', 170), level: store.get('level', 'medium'), occlusion: store.get('occ', false), roundSec: 90 };
const video = $('#cam');
const cam = new FrontCamera(video);
const floor = new FloorEstimator();
const tilt = new TiltSensor();
const pose = new PoseTracker(video);
const ball = new BallTracker(video);
const sfx = new Sfx();
const duel = new Duel(S.level);
let view, defender, ballRing, ballOcc, personOcc;
let phase = 'start';      // start | setup | countdown | play | paused | over
let stats = { drib: 0, loss: 0, foul: 0 }, timeLeft = S.roundSec, phaseT = 0, waitBack = false;

// ---------- start screen ----------
const iH = $('#iH'); iH.value = S.height; const syncH = () => ($('#oH').textContent = `${iH.value} سم`); syncH();
iH.oninput = () => { S.height = +iH.value; store.set('height', S.height); syncH(); };
const diffBtns = document.querySelectorAll('#diff button');
const syncD = () => diffBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.d === S.level)));
diffBtns.forEach((b) => (b.onclick = () => { S.level = b.dataset.d; store.set('level', S.level); syncD(); })); syncD();
$('#iOcc').checked = S.occlusion; $('#iOcc').onchange = (e) => { S.occlusion = e.target.checked; store.set('occ', S.occlusion); };

$('#bStart').onclick = async () => {
  $('#err').hidden = true;
  // iOS: these must start inside the tap, before any await
  const tiltP = tilt.start(); sfx.unlock();
  try { await cam.start(); } catch (e) { $('#err').textContent = cameraErrorMessage(e); $('#err').hidden = false; return; }
  await tiltP;
  show('#start', false); show('#loading'); $('#lText').textContent = 'تحميل تتبع الجسم ورصد الكرة (مرة واحدة)…';
  try { await Promise.all([pose.loadModel(), ball.load()]); }
  catch (e) { console.error(e); show('#loading', false); show('#start'); $('#err').textContent = 'تعذّر تحميل نماذج الذكاء الاصطناعي. تحقق من الاتصال.'; $('#err').hidden = false; return; }
  show('#loading', false);
  setup3D();
  if (S.occlusion) await pose.setMask(true);
  beginSetup();
  requestAnimationFrame(loop);
};

function setup3D() {
  view = new MirrorView($('#gl'));
  defender = makeLifeSizePlayer(1.8, { shirt: 0xc8102e, shorts: 0x111111, socks: 0xc8102e, skin: 0x8d5a3b, number: '4' });
  defender.visible = false; view.world.add(defender);
  ballRing = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.19, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x4fd88a, transparent: true, opacity: 0.8, depthWrite: false }));
  ballRing.visible = false; view.world.add(ballRing);
  // Real ball as a depth-only occluder: the defender's legs hide behind your ball when it's nearer the phone.
  ballOcc = new THREE.Mesh(new THREE.SphereGeometry(BALL_D / 2, 20, 14), new THREE.MeshBasicMaterial({ colorWrite: false }));
  ballOcc.renderOrder = -50; ballOcc.visible = false; view.world.add(ballOcc);
  personOcc = new PersonOccluder(view); personOcc.enabled = S.occlusion;
  addEventListener('resize', () => view.resize());
}

// ---------- phases ----------
function beginSetup() {
  phase = 'setup'; floor.result = null; floor.samples.length = 0;
  floor.userHeight = S.height / 100;
  floor.setVideo(video.videoWidth, video.videoHeight);
  defender && (defender.visible = false);
  show('#hud', false); show('#chips'); show('#prompt');
}
function beginRound() {
  stats = { drib: 0, loss: 0, foul: 0 }; timeLeft = S.roundSec;
  duel.setLevel(S.level);
  spawnDefender();
  phase = 'countdown'; phaseT = 3; show('#hud'); sfx.startCrowd?.();
}
function spawnDefender() {
  const b = ballWorld() || { x: 0, z: -floor.result.Z };
  duel.reset(b); defender.visible = true; waitBack = false;
}
function flash(msg, kind = 'info', ms = 1200) {
  const el = $('#flash'); el.textContent = msg; el.className = `flash ${kind} show`;
  clearTimeout(flash.t); flash.t = setTimeout(() => el.classList.remove('show'), ms);
}
function prompt(msg) { const el = $('#prompt'); el.hidden = !msg; if (msg) el.textContent = msg; }
const pause = () => { if (phase !== 'play' && phase !== 'countdown') return; phase = 'paused'; show('#pause'); };
$('#bPause').onclick = pause;
$('#bResume').onclick = () => { show('#pause', false); phase = 'countdown'; phaseT = 2; };
$('#bRecal').onclick = () => { show('#pause', false); beginSetup(); };
$('#bEnd').onclick = () => { show('#pause', false); endRound(); };
$('#bAgain').onclick = () => { show('#over', false); beginRound(); };
document.addEventListener('visibilitychange', () => document.hidden && pause());
function endRound() {
  phase = 'over'; defender.visible = false; sfx.whistle?.(true);
  $('#oTitle').textContent = stats.drib > stats.loss ? 'تفوّقت على المدافع!' : 'المدافع كان أقوى هذه المرة';
  $('#oRes').innerHTML = `<div><b style="color:var(--good)">${stats.drib}</b><span>مراوغات</span></div><div><b style="color:var(--bad)">${stats.loss}</b><span>كرات ضائعة</span></div><div><b style="color:var(--warn)">${stats.foul}</b><span>أخطاء لك</span></div>`;
  show('#over'); show('#hud', false);
}

// ---------- world helpers ----------
let feet = null;
function ballWorld() {
  if (ball.seen && ball.pos) return { x: ball.pos.x, z: ball.pos.z, vx: ball.vel.x, vz: ball.vel.z, seen: true };
  return null;
}

// ---------- main loop ----------
let last = performance.now();
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000), wdt = Math.min(0.25, (now - last) / 1000); last = now; // dt: motion, wdt: clocks
  if (tilt.available) { floor.pitch = tilt.pitch; floor.pitchSource = 'sensor'; }
  pose.update();
  ball.update(floor);
  const est = floor.estimate(pose.raw);
  feet = floor.feetOnFloor(pose.raw);
  const chk = (id, ok, txt) => { const e = $(id); e.className = ok ? 'ok' : 'no'; if (txt) e.textContent = txt; };
  chk('#cBody', est.ok, est.ok ? 'الجسم ✓' : 'الجسم ✗');
  chk('#cBall', ball.seen, ball.seen ? 'الكرة ✓' : 'الكرة ✗');
  chk('#cCal', !!floor.result, floor.result ? `معايَر ${floor.pitchSource === 'sensor' ? '+ ميلان' : '(ميلان مفترض)'}` : 'معايرة…');

  if (phase === 'setup') {
    // need: full body, the ball near your feet, standing still for 1.5 s
    const wallDt = Math.min(0.3, (now - (loop.setupT || now)) / 1000); loop.setupT = now; // wall clock: frame dt is capped
    if (!est.ok) { prompt(est.reason === 'no-feet' ? 'ابتعد قليلاً حتى تظهر قدماك كاملتين.' : 'قف أمام الكاميرا على بعد 3 أمتار حتى يظهر جسمك كاملاً.'); floor.samples.length = 0; }
    else if (!ball.seen) { prompt('ضع الكرة عند قدميك أمامك حتى تُرصد (دائرة خضراء تحتها).'); floor.addSample(est, wallDt); }
    else {
      const p = floor.addSample(est, wallDt);
      prompt(`اثبت مكانك… ${Math.round(p * 100)}%`);
      if (p >= 1) { floor.finish(); tilt.lockReference(); prompt(''); sfx.beep?.(true); beginRound(); }
    }
  }

  if (view && floor.result) {
    view.fit(floor, video); view.setFloor(floor.result.floorY); view.updateLight(video, dt);
    const b = ballWorld();
    // the real ball hides the defender only when it is actually in front of him (nearer the phone)
    ballRing.visible = !!b && phase !== 'over'; ballOcc.visible = !!b && defender.visible && b.z > duel.z + 0.05;
    if (b) { ballRing.position.set(b.x, 0.004, b.z); ballOcc.position.set(b.x, BALL_D / 2, b.z); ballRing.material.color.setHex(duel.state === 'lunge' ? 0xff5a5a : 0x4fd88a); }
    personOcc.update(pose.mask, (est.ok ? est.Z : floor.result.Z) / Math.cos(floor.pitch), video);

    if (phase === 'countdown') {
      phaseT -= wdt; prompt(''); flash(phaseT > 0.5 ? `${Math.ceil(phaseT)}` : 'راوغ!', 'info', 500);
      if (phaseT <= 0) { phase = 'play'; sfx.whistle?.(); }
    }
    if (phase === 'play') {
      timeLeft -= wdt; if (timeLeft <= 0) { endRound(); }
      // The ball the defender chases: the real ball, or (briefly lost) your feet as a stand-in.
      const target = b || (feet ? { x: feet.x, z: feet.z + 0.25, vx: 0, vz: 0, seen: false } : null);
      if (tilt.available && tilt.moved > THREE.MathUtils.degToRad(2.5)) { prompt('تحرك الجوال! أعد المعايرة من زر الإيقاف.'); }
      else if (est.ok && est.Z < 1.4) prompt('اقتربت كثيراً من الجوال — ارجع للخلف.');
      else if (waitBack) prompt('ارجع بالكرة لمكان البداية ليعود المدافع.');
      else if (!b) prompt('لا أرى الكرة…');
      else prompt('');
      if (waitBack) {
        if (b && b.z < -floor.result.Z + 0.5) spawnDefender();
      } else if (target) {
        for (const e of duel.update(dt, now / 1000, target, feet)) {
          if (e.type === 'lunge') { playKick(defender.userData.model, Math.sign((target.x - duel.x) || 1)); }
          if (e.type === 'won') { stats.loss++; flash(e.how === 'block' ? 'المدافع صدّ الكرة!' : 'فقدت الكرة!', 'bad', 1500); sfx.tackle?.(); sfx.groan?.(); setTimeout(() => phase === 'play' && spawnDefender(), 1600); }
          if (e.type === 'foul') { stats.foul++; flash('خطأ على المدافع!', 'warn', 1400); sfx.whistle?.(); }
          if (e.type === 'miss') { flash('نجوت من التدخل!', 'good', 900); sfx.whoosh?.(); }
          if (e.type === 'beaten') { stats.drib++; flash('مراوغة ناجحة ✓', 'good', 1400); sfx.whoosh?.(); sfx.cheer?.(); waitBack = true; }
        }
      }
    }
    // render the defender
    if (defender.visible) {
      defender.scale.setScalar(1.8 / defender.userData.natH);
      defender.position.set(duel.x, 0, duel.z); defender.rotation.y = duel.facing;
      const st = duel.state;
      idle(defender, dt, duel.speed * 2.2, { lean: st === 'lunge' ? 0.35 : st === 'jockey' ? 0.12 : 0, tilt: st === 'beaten' ? Math.sign(duel.vx || 1) * 1.5 : 0 });
      view.aimLight(duel.x, duel.z);
    }
    $('#hTime').textContent = `${Math.floor(Math.max(0, timeLeft) / 60)}:${String(Math.ceil(Math.max(0, timeLeft)) % 60).padStart(2, '0')}`;
    $('#hDrib').textContent = stats.drib; $('#hLoss').textContent = stats.loss; $('#hFoul').textContent = stats.foul;
  }
  view?.render();
}

window.__rbd = { duel, ball, pose, floor, tilt, get phase() { return phase; }, get feet() { return feet; }, get stats() { return stats; }, S };
