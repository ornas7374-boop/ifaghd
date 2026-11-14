// App shell: support detection, the three modes (WebXR AR, mirror AR, preview), screens,
// settings and the main loop (camera → intent → game → AR render).
import * as THREE from 'three';
import { ARScene } from './arscene.js';
import { checkXR, XRSessionController } from './xr.js';
import { MirrorAR } from './mirror.js';
import { attachGestures } from './gestures.js';
import { Game } from './game.js';
import { Sfx } from './audio.js';
import { PoseTracker, BodyController, BONES } from './pose.js';
import { FallbackControls } from './controls.js';
import { DIFFICULTY, PITCH, loadSettings, saveSettings, loadBest, saveBest } from './config.js';

const $ = (s) => document.querySelector(s);
const show = (el, on = true) => { (typeof el === 'string' ? $(el) : el).hidden = !on; };

const settings = loadSettings();
const ar = new ARScene($('#scene'));
const sfx = new Sfx();
const fallback = new FallbackControls(document);
const body = new BodyController();
const video = $('#camVideo');
const tracker = new PoseTracker(video);
const mirror = new MirrorAR(ar, video);
const xr = new XRSessionController(ar, $('#ui'));

let mode = null;          // 'xr' | 'mirror' | 'preview'
let phase = 'menu';       // menu | place | calib | play | paused | results
let editing = false;      // moving / scaling the arena
let matchRunning = false;
let modelReady = false;
let xrInfo = { ok: false, reason: 'checking' };

// ---------- UI feedback ----------
let flashTimer = 0, smallTimer = 0;
const ui = {
  flash(msg, kind = 'info', time = 1.2) {
    const el = $('#flash'); el.textContent = msg; el.className = `flash ${kind} show`;
    clearTimeout(flashTimer); flashTimer = setTimeout(() => el.classList.remove('show'), Math.max(500, time * 1000 - 150));
  },
  flashSmall(msg, kind = 'info') {
    const el = $('#flashSmall'); el.textContent = msg; el.className = `flash-small ${kind} show`;
    clearTimeout(smallTimer); smallTimer = setTimeout(() => el.classList.remove('show'), 1100);
  },
  onMatchOver(s) {
    phase = 'results';
    sfx.stopCrowd();
    const best = loadBest(); const key = settings.difficulty;
    const isBest = !best[key] || s.score > best[key];
    if (isBest) { best[key] = s.score; saveBest(best); }
    $('#resTitle').textContent = s.goals > 0 ? `${s.goals} ${s.goals === 1 ? 'هدف' : 'أهداف'} و${s.dribbles} مراوغات` : `${s.dribbles} مراوغات ناجحة`;
    const cell = (v, l, cls = '') => `<div class="${cls}"><b>${v}</b><span>${l}</span></div>`;
    $('#resGrid').innerHTML =
      cell(s.score, 'النقاط', 'big') + cell(s.goals, 'أهداف') + cell(s.dribbles, 'مراوغات ناجحة') + cell(s.losses, 'كرات ضائعة') +
      cell(s.fouls, 'أخطاء احتُسبت لك') + cell(`${s.possession}%`, 'الاستحواذ') + cell(s.feints, 'تمويهات') + cell(s.touches, 'لمسات') + cell(`${s.shots}/${s.saves}`, 'تسديدات/تصديات');
    $('#resBest').textContent = isBest ? `رقم قياسي جديد على مستوى ${DIFFICULTY[key].label}!` : `أفضل نتيجة (${DIFFICULTY[key].label}): ${best[key]}`;
    show('#results'); show('#hud', false); show('#touch', false);
  },
};
const game = new Game(ar.arena, sfx, ui);

// ---------- Support detection (honest status, no fake AR) ----------
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
async function detectSupport() {
  xrInfo = await checkXR();
  const supXR = $('#supXR'), btn = $('#startXR');
  if (xrInfo.ok) {
    supXR.innerHTML = '<span class="ok">✓ جهازك يدعم الواقع المعزز الحقيقي (WebXR): تتبع الأرض وتثبيت الملعب في المكان.</span>';
    btn.disabled = false;
  } else {
    btn.disabled = true;
    const why = isIOS
      ? 'iPhone وSafari لا يدعمان WebXR للواقع المعزز حالياً (قيد من Apple). استخدم «وضع المرآة» بدلاً منه.'
      : xrInfo.reason === 'insecure' ? 'الواقع المعزز يحتاج اتصال https.'
        : xrInfo.reason === 'no-webxr' ? 'هذا المتصفح لا يدعم WebXR. على Android استخدم Chrome المحدّث.'
          : 'جهازك لا يدعم جلسة واقع معزز (يتطلب Android مع Google Play Services for AR).';
    supXR.innerHTML = `<span class="no">✗ الواقع المعزز المتتبع للمكان غير متاح هنا.</span> ${why}`;
  }
  const camOk = !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;
  $('#supCam').innerHTML = camOk ? '<span class="ok">✓ الكاميرا متاحة لوضع المرآة (تحكم بالجسم).</span>'
    : '<span class="no">✗ الكاميرا غير متاحة (تحتاج https أو localhost).</span>';
  $('#startMirror').disabled = !camOk;
}

// ---------- Menu ----------
function refreshMenu() {
  document.querySelectorAll('#diffPick button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.d === settings.difficulty)));
  const best = loadBest();
  const parts = Object.entries(DIFFICULTY).filter(([k]) => best[k]).map(([k, v]) => `${v.label}: ${best[k]}`);
  $('#bestLine').textContent = parts.length ? `أفضل نتائجك: ${parts.join(' • ')}` : '';
}
document.querySelectorAll('#diffPick button').forEach((b) => b.addEventListener('click', () => { settings.difficulty = b.dataset.d; saveSettings(settings); refreshMenu(); }));
$('#openHelp').onclick = () => show('#help');
$('#openSettings').onclick = () => openSettings();
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { b.closest('.overlay').hidden = true; if (b.closest('#settings')) applySettings(); }));

$('#startXR').onclick = startXR;
$('#startMirror').onclick = startMirror;
$('#startPreview').onclick = startPreview;

// ---------- Settings ----------
function openSettings() {
  $('#sDiff').value = settings.difficulty; $('#sDef').value = settings.defenders; $('#sSpeed').value = settings.speedMul;
  $('#sRound').value = String(settings.roundSec); $('#sSens').value = settings.sensitivity; $('#sScale').value = settings.arScale;
  $('#sGk').checked = settings.goalkeeper; $('#sCam').checked = settings.showCam; $('#sTouchMirror').checked = settings.touchMirror; $('#sSound').checked = settings.sound;
  syncOutputs(); show('#settings');
}
function syncOutputs() {
  $('#oDef').textContent = $('#sDef').value;
  $('#oSpeed').textContent = `×${Number($('#sSpeed').value).toFixed(2)}`;
  $('#oSens').textContent = `×${Number($('#sSens').value).toFixed(2)}`;
  $('#oScale').textContent = `${Math.round(Number($('#sScale').value) * 100)}%`;
}
['#sDef', '#sSpeed', '#sSens', '#sScale'].forEach((s) => $(s).addEventListener('input', syncOutputs));
function applySettings() {
  const before = JSON.stringify([settings.defenders, settings.difficulty, settings.speedMul, settings.goalkeeper, settings.roundSec]);
  settings.difficulty = $('#sDiff').value; settings.defenders = Number($('#sDef').value); settings.speedMul = Number($('#sSpeed').value);
  settings.roundSec = Number($('#sRound').value); settings.sensitivity = Number($('#sSens').value); settings.arScale = Number($('#sScale').value);
  settings.goalkeeper = $('#sGk').checked; settings.showCam = $('#sCam').checked; settings.touchMirror = $('#sTouchMirror').checked; settings.sound = $('#sSound').checked;
  saveSettings(settings); refreshMenu();
  body.sensitivity = settings.sensitivity; sfx.setEnabled(settings.sound);
  if (mode === 'xr') xr.setScale(settings.arScale);
  if (mode === 'mirror') mirror.setScale(settings.arScale);
  const after = JSON.stringify([settings.defenders, settings.difficulty, settings.speedMul, settings.goalkeeper, settings.roundSec]);
  if (before !== after && matchRunning) { game.newMatch(settings); ui.flashSmall('بدأت جولة جديدة بالإعدادات الجديدة'); }
  updateChrome();
}

// Show/hide HUD, touch controls, PiP according to mode/phase.
function updateChrome() {
  const playing = phase === 'play' || phase === 'paused';
  show('#hud', playing && !editing);
  const touch = playing && !editing && (mode === 'xr' || (mode === 'preview' && matchMedia('(pointer:coarse)').matches) || (mode === 'mirror' && settings.touchMirror));
  show('#touch', touch);
  show('#pip', mode === 'mirror' && settings.showCam && (playing || phase === 'calib'));
  show('#btnEdit', mode !== 'preview');
  document.body.classList.toggle('touchmode', touch);
  const placing = phase === 'place' || editing;
  show('#gestureLayer', placing);
  show('#placeBar', placing);
  show('#btnPlaceDone', editing && (mode === 'mirror' || !!ar.arenaPos));
  $('#placeHint').textContent = mode === 'xr'
    ? (editing ? 'المس مكاناً جديداً على الأرض لنقل الملعب، أو كبّر/دوّر بإصبعين، ثم «تم».' : 'وجّه الجوال نحو الأرض وحرّكه ببطء حتى تظهر الدائرة، ثم المس الشاشة لوضع الملعب.')
    : 'اسحب لتحريك الملعب على أرضك، وبإصبعين للتكبير والتدوير، ثم «تم».';
  const badge = $('#arBadge');
  if (mode === 'xr') { badge.textContent = `WebXR AR • ${xr.anchor ? 'مثبّت بمرساة' : 'مثبّت بالموضع'}${xr.features.light ? ' • إضاءة حقيقية' : ''}`; show(badge, playing); }
  else if (mode === 'mirror') { badge.textContent = `وضع المرآة • ${body.source === 'feet' ? 'الأرض من قدميك' : 'أرض تقديرية'}`; show(badge, playing); }
  else if (mode === 'preview') { badge.textContent = 'معاينة: ليست واقعاً معززاً'; show(badge, playing); }
}

// ---------- WebXR mode ----------
async function startXR() {
  sfx.unlock();
  try {
    xr.scale = settings.arScale;
    await xr.start();
  } catch (e) {
    console.error(e);
    alert('تعذّر بدء جلسة الواقع المعزز: ' + (e?.message || e) + '\nجرّب «وضع المرآة».');
    return;
  }
  mode = 'xr'; document.body.className = 'xr';
  show('#menu', false);
  phase = 'place'; editing = false;
  xr.onPlaced = () => {
    sfx.beep(true);
    if (!matchRunning) startMatch();
    else { editing = false; phase = 'play'; }
    updateChrome();
  };
  xr.onEnd = () => toMenu();
  updateChrome();
}

// ---------- Mirror mode ----------
async function startMirror() {
  sfx.unlock();
  show('#menu', false); show('#loading'); $('#loadingText').textContent = 'طلب إذن الكاميرا…';
  try {
    if (!tracker.stream) await tracker.startCamera();
    if (!modelReady) { $('#loadingText').textContent = 'تحميل نموذج تتبع الجسم (مرة واحدة)…'; await tracker.loadModel(); modelReady = true; }
  } catch (e) {
    console.error(e);
    show('#loading', false); show('#menu');
    const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
    alert(denied ? 'لم يُسمح باستخدام الكاميرا. فعّل الإذن من إعدادات المتصفح.' : 'تعذّر تشغيل الكاميرا أو تحميل نموذج التتبع. تحقق من الاتصال وحاول مجدداً.');
    return;
  }
  show('#loading', false);
  mode = 'mirror'; document.body.className = 'mirror';
  mirror.scale = settings.arScale;
  mirror.fitCamera(); mirror.fallbackFloor(); mirror.apply();
  startCalibration();
}

function startCalibration() {
  phase = 'calib'; editing = false;
  body.reset(); body.sensitivity = settings.sensitivity;
  show('#calib'); $('#calibBar').style.width = '0';
  updateChrome();
}
let calibForce = false;
$('#calibCancel').onclick = () => toMenu();
$('#calibSkip').onclick = () => { calibForce = true; };

function calibStep(dt) {
  const pts = tracker.points;
  const chk = body.frameCheck(pts);
  document.querySelectorAll('#checks li').forEach((li) => li.classList.toggle('ok', !!chk[li.dataset.k]));
  if (chk.feet) { mirror.estimate(tracker.raw); mirror.apply(); }
  const ready = chk.shoulders && chk.hips && (calibForce || chk.feet || chk.knees);
  const p = ready ? body.calibrate(pts, dt) : (body.calibSamples.length = 0, 0);
  $('#calibBar').style.width = `${Math.round(p * 100)}%`;
  $('#calibHint').textContent = !chk.body ? 'لا أرى أحداً. قف أمام الكاميرا على بعد 2 إلى 3 أمتار.'
    : !chk.shoulders || !chk.hips ? 'حسّن الإضاءة أو اقترب قليلاً حتى يظهر الجذع.'
      : !chk.feet && !calibForce ? 'ابتعد قليلاً حتى تظهر قدماك: منها نحدد مكان الأرض لوضع اللاعب عليها.'
        : 'ممتاز! اثبت في مكانك…';
  if (p >= 1) {
    calibForce = false; show('#calib', false); sfx.beep(true);
    if (!matchRunning || game.state === 'over') startMatch(); else { phase = 'play'; updateChrome(); }
  }
}

// ---------- Preview mode (no AR) ----------
function startPreview() {
  sfx.unlock();
  mode = 'preview'; document.body.className = 'preview';
  show('#menu', false);
  ar.setArenaTransform(new THREE.Vector3(0, 0, 0), 0, 1);
  startMatch();
}

// ---------- Placement / edit ----------
$('#btnEdit').onclick = () => {
  if (phase !== 'play' && phase !== 'paused') return;
  editing = true; if (phase === 'paused') { phase = 'play'; show('#pause', false); }
  if (mode === 'xr') xr.startReplace();
  updateChrome();
};
$('#btnPlaceDone').onclick = () => { editing = false; if (mode === 'xr') xr.placing = false; updateChrome(); };
const scaleBy = (k) => {
  if (mode === 'xr') xr.setScale(xr.scale * k); else if (mode === 'mirror') mirror.setScale(mirror.scale * k);
  settings.arScale = mode === 'xr' ? xr.scale : mirror.scale; saveSettings(settings);
};
const rotateBy = (a) => { if (mode === 'xr') xr.rotate(a); else if (mode === 'mirror') mirror.rotate(a); };
$('#btnBigger').onclick = () => scaleBy(1.15);
$('#btnSmaller').onclick = () => scaleBy(1 / 1.15);
$('#btnRotL').onclick = () => rotateBy(0.26);
$('#btnRotR').onclick = () => rotateBy(-0.26);
attachGestures($('#gestureLayer'), {
  onTap: () => { if (mode === 'xr' && xr.placing) xr.place(); },
  onDrag: (dx, dy) => { if (mode === 'mirror') mirror.drag(dx, dy, innerWidth, innerHeight); },
  onPinch: (k) => scaleBy(k),
  onRotate: (a) => rotateBy(a),
});
// Taps on our DOM overlay must not also count as XR "select" (which would re-place the arena).
$('#ui').addEventListener('beforexrselect', (e) => e.preventDefault());

// ---------- Match control ----------
function startMatch() {
  phase = 'play'; matchRunning = true; editing = false;
  ['#menu', '#results', '#pause', '#calib'].forEach((s) => show(s, false));
  fallback.enabled = true;
  game.newMatch(settings);
  sfx.startCrowd();
  updateChrome();
}
function pause() { if (phase !== 'play' || editing) return; phase = 'paused'; show('#pause'); sfx.stopCrowd(); updateChrome(); }
function resume() { if (phase !== 'paused') return; phase = 'play'; show('#pause', false); sfx.unlock(); sfx.startCrowd(); updateChrome(); }
$('#btnPause').onclick = pause;
$('#btnRestart').onclick = () => startMatch();
$('#resume').onclick = resume;
$('#recalib').onclick = () => { show('#pause', false); if (mode === 'mirror') startCalibration(); else resume(); };
$('#pauseSettings').onclick = openSettings;
function toMenu() {
  if (mode === 'xr' && xr.session) { xr.onEnd = null; xr.end(); }
  phase = 'menu'; mode = null; matchRunning = false; editing = false; game.state = 'idle';
  document.body.className = '';
  ar.camera.fov = 55; ar.resize();
  ar.setArenaTransform(new THREE.Vector3(0, 0, 0), 0, 1); ar.arenaPos = null; // menu backdrop
  ar.setAmbient(1, new THREE.Color(1, 1, 1)); ar.hemi.visible = true;
  ['#pause', '#results', '#calib', '#loading'].forEach((s) => show(s, false));
  show('#menu'); refreshMenu(); sfx.stopCrowd(); fallback.enabled = false;
  updateChrome();
}
$('#toMenu').onclick = toMenu; $('#resMenu').onclick = toMenu; $('#btnExit').onclick = toMenu;
$('#playAgain').onclick = () => startMatch();
addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key.toLowerCase() === 'p') { phase === 'play' ? pause() : phase === 'paused' && resume(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// ---------- Skeleton PiP ----------
function drawPose(canvas) {
  const c = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  c.save(); c.translate(W, 0); c.scale(-1, 1);
  if (video.readyState >= 2) c.drawImage(video, 0, 0, W, H); else { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }
  c.restore();
  const r = tracker.raw; if (!r) return;
  c.lineWidth = 3; c.strokeStyle = '#4fd88a'; c.lineCap = 'round';
  for (const [i, j] of BONES) {
    if (r[i].v < 0.4 || r[j].v < 0.4) continue;
    c.beginPath(); c.moveTo(r[i].x * W, r[i].y * H); c.lineTo(r[j].x * W, r[j].y * H); c.stroke();
  }
  if (body.calib) {
    const aspect = (video.videoWidth || 4) / (video.videoHeight || 3);
    const cx = (body.calib.cx / aspect) * W;
    c.strokeStyle = 'rgba(63,167,255,.8)'; c.setLineDash([5, 5]); c.lineWidth = 2;
    c.beginPath(); c.moveTo(cx, 0); c.lineTo(cx, H); c.stroke(); c.setLineDash([]);
  }
}
let pipT = 0;
function updatePip(dt, intent) {
  if ($('#pip').hidden) return;
  pipT -= dt; if (pipT > 0) return; pipT = 1 / 12;
  drawPose($('#pipCanvas'));
  const st = $('#mSteer'); const w = Math.abs(intent.steer) * 50;
  st.style.width = `${w}%`; st.style.left = intent.steer >= 0 ? '50%' : `${50 - w}%`;
  $('#mRun').style.width = `${Math.round(intent.run * 100)}%`;
  const src = { feet: 'القدمين', knees: 'الركبتين', hips: 'الورك', none: '—' }[body.source];
  $('#pipStatus').textContent = tracker.tracking ? `يتتبع ${src} • ${Math.round(tracker.fps)} fps` : '⚠ لا أرى جسمك';
}

// ---------- HUD ----------
let hudT = 0;
function updateHud(dt) {
  hudT -= dt; if (hudT > 0) return; hudT = 0.12;
  const s = game.summary(), tl = Math.ceil(game.timeLeft);
  $('#hudTime').textContent = `${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')}`;
  $('#hudTime').classList.toggle('low', tl <= 10);
  $('#hudScore').textContent = s.score; $('#hudGoals').textContent = s.goals; $('#hudDribbles').textContent = s.dribbles;
  $('#hudLosses').textContent = s.losses; $('#hudFouls').textContent = s.fouls; $('#hudPoss').textContent = `${s.possession}%`;
}

// ---------- Cameras for non-XR modes ----------
const _look = new THREE.Vector3();
function previewCamera(dt) {
  const a = game.att || { x: 0, z: PITCH.startZ };
  const cam = ar.camera, k = 1 - Math.exp(-dt * 4);
  cam.position.lerp(new THREE.Vector3(a.x * 0.6, 3.2, a.z + 4.6), k);
  _look.lerp(new THREE.Vector3(a.x * 0.8, 0, a.z - 3), k);
  cam.lookAt(_look);
}
function menuCamera(t) {
  ar.camera.position.set(Math.sin(t * 0.15) * 7, 4, Math.cos(t * 0.15) * 7);
  ar.camera.lookAt(0, 0, 0);
}
ar.onResize = () => { if (mode === 'mirror') { mirror.fitCamera(); mirror.apply(); } };

// ---------- Main loop (setAnimationLoop also drives WebXR frames) ----------
let last = performance.now(), lostT = 0, chromeT = 0;
ar.renderer.setAnimationLoop((time, frame) => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now / 1000;

  if (mode === 'xr') xr.update(frame);

  let intent = { steer: 0, run: 0, depth: 0, events: [] };
  if (mode === 'mirror' && modelReady) {
    tracker.update();
    mirror.updateLight(dt);
    if (phase === 'calib') calibStep(dt);
    else if (phase === 'play' || phase === 'paused') {
      body.update(tracker.points, t);
      const ev = body.drain();
      for (const e of ev) if (e.type === 'handsUp') { phase === 'play' ? pause() : resume(); }
      intent = { steer: body.steer, run: body.run, depth: body.depth, events: ev.filter((e) => e.type !== 'handsUp') };
      if (phase === 'play' && !editing && !tracker.tracking) { lostT += dt; if (lostT > 2.5) { lostT = 0; pause(); ui.flashSmall('لا أرى جسمك: تم الإيقاف المؤقت', 'warn'); } } else lostT = 0;
    }
  }
  const fb = fallback.read(dt);
  if (fallback.enabled && phase === 'play') {
    if (Math.abs(fb.steer) > Math.abs(intent.steer)) intent.steer = fb.steer;
    if (fb.run > intent.run) intent.run = fb.run;
    if (fb.depth) intent.depth = fb.depth;
    intent.events = intent.events.concat(fb.events);
  }

  if (phase === 'play' && !editing) { game.update(dt, intent); updateHud(dt); }
  if (mode === 'preview') previewCamera(dt);
  else if (!mode) menuCamera(t);
  updatePip(dt, intent);
  chromeT -= dt; if (chromeT <= 0) { chromeT = 0.5; if (phase === 'play') updateChrome(); }
  ar.render();
});

// ---------- boot ----------
body.sensitivity = settings.sensitivity;
sfx.setEnabled(settings.sound);
refreshMenu();
detectSupport();
// Menu backdrop: show the arena spinning slowly.
ar.setArenaTransform(new THREE.Vector3(0, 0, 0), 0, 1);
game.newMatch(settings); game.state = 'idle'; $('#flash').className = 'flash';
ar.arenaPos = null;
window.__arfd = { game, ar, xr, mirror, body, tracker, settings, get phase() { return phase; }, get mode() { return mode; }, toMenu };
