// App shell: screens, settings, main loop, wiring camera → intent → game.
import { World } from './world.js';
import { Game } from './game.js';
import { Sfx } from './audio.js';
import { PoseTracker, BodyController, BONES } from './pose.js';
import { FallbackControls } from './controls.js';
import { DIFFICULTY, loadSettings, saveSettings, loadBest, saveBest } from './config.js';

const $ = (s) => document.querySelector(s);
const show = (el, on = true) => { (typeof el === 'string' ? $(el) : el).hidden = !on; };

const settings = loadSettings();
const world = new World($('#scene'));
const sfx = new Sfx();
const fallback = new FallbackControls(document);
const body = new BodyController();
const tracker = new PoseTracker($('#arVideo'));

let mode = null;          // 'cam' | 'keys'
let phase = 'menu';       // menu | calib | play | paused | results
let modelReady = false;

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
    const best = loadBest(); const key = `${settings.difficulty}`;
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
const game = new Game(world, sfx, ui);

// ---------- Menu ----------
function refreshMenu() {
  document.querySelectorAll('#diffPick button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.d === settings.difficulty)));
  const best = loadBest();
  const parts = Object.entries(DIFFICULTY).filter(([k]) => best[k]).map(([k, v]) => `${v.label}: ${best[k]}`);
  $('#bestLine').textContent = parts.length ? `أفضل نتائجك — ${parts.join(' • ')}` : '';
}
document.querySelectorAll('#diffPick button').forEach((b) => b.addEventListener('click', () => { settings.difficulty = b.dataset.d; saveSettings(settings); refreshMenu(); }));
$('#openHelp').onclick = () => show('#help');
$('#openSettings').onclick = () => openSettings();
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { b.closest('.overlay').hidden = true; if (b.closest('#settings')) applySettings(); }));

$('#startKeys').onclick = () => { sfx.unlock(); mode = 'keys'; startMatch(); };
$('#startCam').onclick = () => { sfx.unlock(); mode = 'cam'; beginCamera(); };

// ---------- Settings ----------
function openSettings() {
  $('#sDiff').value = settings.difficulty; $('#sDef').value = settings.defenders; $('#sSpeed').value = settings.speedMul;
  $('#sRound').value = String(settings.roundSec); $('#sSens').value = settings.sensitivity;
  $('#sGk').checked = settings.goalkeeper; $('#sCam').checked = settings.showCam; $('#sAR').checked = settings.arMode; $('#sSound').checked = settings.sound;
  syncOutputs(); show('#settings');
}
function syncOutputs() {
  $('#oDef').textContent = $('#sDef').value;
  $('#oSpeed').textContent = `×${Number($('#sSpeed').value).toFixed(2)}`;
  $('#oSens').textContent = `×${Number($('#sSens').value).toFixed(2)}`;
}
['#sDef', '#sSpeed', '#sSens'].forEach((s) => $(s).addEventListener('input', syncOutputs));
function applySettings() {
  const prevDef = settings.defenders, prevDiff = settings.difficulty, prevSpeed = settings.speedMul, prevGk = settings.goalkeeper, prevRound = settings.roundSec;
  settings.difficulty = $('#sDiff').value; settings.defenders = Number($('#sDef').value); settings.speedMul = Number($('#sSpeed').value);
  settings.roundSec = Number($('#sRound').value); settings.sensitivity = Number($('#sSens').value);
  settings.goalkeeper = $('#sGk').checked; settings.showCam = $('#sCam').checked; settings.arMode = $('#sAR').checked; settings.sound = $('#sSound').checked;
  saveSettings(settings); refreshMenu(); applyLive();
  const structural = prevDef !== settings.defenders || prevDiff !== settings.difficulty || prevSpeed !== settings.speedMul || prevGk !== settings.goalkeeper || prevRound !== settings.roundSec;
  if (structural && (phase === 'paused' || phase === 'play')) { game.newMatch(settings); ui.flashSmall('بدأت جولة جديدة بالإعدادات الجديدة'); }
}
function applyLive() {
  body.sensitivity = settings.sensitivity;
  sfx.setEnabled(settings.sound);
  const camOn = mode === 'cam' && !!tracker.stream;
  world.setAR(settings.arMode && camOn);
  document.body.classList.toggle('ar', settings.arMode && camOn);
  show('#pip', camOn && settings.showCam && (phase === 'play' || phase === 'paused'));
}

// ---------- Camera flow ----------
async function beginCamera() {
  show('#menu', false); show('#loading'); $('#loadingText').textContent = 'طلب إذن الكاميرا…';
  try {
    if (!tracker.stream) await tracker.startCamera();
    if (!modelReady) {
      $('#loadingText').textContent = 'تحميل نموذج تتبع الجسم (مرة واحدة فقط)…';
      await tracker.loadModel(); modelReady = true;
    }
  } catch (e) {
    console.error(e);
    show('#loading', false); show('#menu');
    const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
    const msg = denied ? 'لم يُسمح باستخدام الكاميرا. فعّل الإذن من إعدادات المتصفح، أو جرّب وضع الكيبورد.'
      : e?.message === 'NO_MEDIA' ? 'المتصفح لا يدعم الكاميرا هنا. افتح الصفحة عبر https أو localhost.'
        : 'تعذّر تشغيل الكاميرا أو تحميل نموذج التتبع. تحقق من الاتصال وحاول مجدداً.';
    alert(msg);
    return;
  }
  show('#loading', false);
  startCalibration();
}

function startCalibration() {
  phase = 'calib';
  body.reset(); body.sensitivity = settings.sensitivity;
  show('#calib'); show('#hud', false); show('#pip', false);
  $('#calibTitle').textContent = 'قف أمام الكاميرا';
  $('#calibBar').style.width = '0';
}
$('#calibCancel').onclick = () => { phase = 'menu'; show('#calib', false); show('#menu'); refreshMenu(); };
$('#calibSkip').onclick = () => { calibForce = true; };
let calibForce = false;

function calibStep(dt) {
  const pts = tracker.points;
  const chk = body.frameCheck(pts);
  document.querySelectorAll('#checks li').forEach((li) => li.classList.toggle('ok', !!chk[li.dataset.k]));
  drawPose($('#calibCanvas'), true);
  const needFeet = !calibForce;
  const ready = chk.shoulders && chk.hips && (!needFeet || chk.feet || chk.knees);
  const p = ready ? body.calibrate(pts, dt) : (body.calibSamples.length = 0, 0);
  $('#calibBar').style.width = `${Math.round(p * 100)}%`;
  $('#calibHint').textContent = !chk.body ? 'لا أرى أحداً. قف أمام الكاميرا على بعد 2–3 أمتار.'
    : !chk.shoulders || !chk.hips ? 'اقترب قليلاً أو حسّن الإضاءة حتى يظهر الجذع.'
      : !(chk.feet || chk.knees) && needFeet ? 'ابتعد قليلاً حتى تظهر ركبتاك وقدماك، أو اضغط "ابدأ بدون القدمين".'
        : 'ممتاز! اثبت في مكانك…';
  if (p >= 1) { calibForce = false; show('#calib', false); sfx.beep(true); if (!matchRunning || game.state === 'over') startMatch(); else resumeFromCalib(); }
}
let matchRunning = false;
function resumeFromCalib() { phase = 'play'; show('#hud'); applyLive(); }

// ---------- Match control ----------
function startMatch() {
  phase = 'play'; matchRunning = true;
  show('#menu', false); show('#results', false); show('#pause', false); show('#hud');
  fallback.enabled = true;
  const touchUI = mode === 'keys' && matchMedia('(pointer:coarse)').matches;
  show('#touch', touchUI); document.body.classList.toggle('touchmode', touchUI);
  applyLive();
  game.newMatch(settings);
  sfx.startCrowd();
}
function pause() { if (phase !== 'play') return; phase = 'paused'; show('#pause'); sfx.stopCrowd(); }
function resume() { if (phase !== 'paused') return; phase = 'play'; show('#pause', false); sfx.unlock(); sfx.startCrowd(); }
$('#btnPause').onclick = pause;
$('#btnRestart').onclick = () => { show('#pause', false); startMatch(); };
$('#resume').onclick = resume;
$('#recalib').onclick = () => { show('#pause', false); if (mode === 'cam') startCalibration(); else resume(); };
$('#pauseSettings').onclick = openSettings;
const toMenu = () => { phase = 'menu'; matchRunning = false; game.state = 'idle'; ['#pause', '#results', '#hud', '#touch', '#pip'].forEach((s) => show(s, false)); show('#menu'); refreshMenu(); sfx.stopCrowd(); fallback.enabled = false; };
$('#toMenu').onclick = toMenu; $('#resMenu').onclick = toMenu;
$('#playAgain').onclick = () => { if (mode === 'cam') { show('#results', false); startMatch(); } else startMatch(); };
addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key.toLowerCase() === 'p') { phase === 'play' ? pause() : phase === 'paused' && resume(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// ---------- Drawing the camera + skeleton ----------
function drawPose(canvas, big = false) {
  const c = canvas.getContext('2d'), W = canvas.width, H = canvas.height, v = tracker.video;
  c.save(); c.translate(W, 0); c.scale(-1, 1);
  if (v.readyState >= 2) c.drawImage(v, 0, 0, W, H); else { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }
  c.restore();
  const r = tracker.raw; if (!r) return;
  c.lineWidth = big ? 4 : 3; c.strokeStyle = '#4fd88a'; c.lineCap = 'round';
  for (const [i, j] of BONES) {
    if (r[i].v < 0.4 || r[j].v < 0.4) continue;
    c.beginPath(); c.moveTo(r[i].x * W, r[i].y * H); c.lineTo(r[j].x * W, r[j].y * H); c.stroke();
  }
  c.fillStyle = '#fff';
  for (const k of [0, 15, 16, 25, 26, 27, 28]) if (r[k].v > 0.4) { c.beginPath(); c.arc(r[k].x * W, r[k].y * H, big ? 5 : 3.5, 0, 7); c.fill(); }
  // neutral position line
  if (body.calib) {
    const aspect = (v.videoWidth || 4) / (v.videoHeight || 3);
    const cx = (body.calib.cx / aspect) * W;
    c.strokeStyle = 'rgba(63,167,255,.8)'; c.setLineDash([6, 6]); c.lineWidth = 2;
    c.beginPath(); c.moveTo(cx, 0); c.lineTo(cx, H); c.stroke(); c.setLineDash([]);
  }
}

// ---------- HUD ----------
let hudT = 0;
function updateHud(dt) {
  hudT -= dt; if (hudT > 0) return; hudT = 0.1;
  const s = game.summary();
  const tl = Math.ceil(game.timeLeft);
  $('#hudTime').textContent = `${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')}`;
  $('#hudTime').classList.toggle('low', tl <= 10);
  $('#hudScore').textContent = s.score; $('#hudGoals').textContent = s.goals; $('#hudDribbles').textContent = s.dribbles;
  $('#hudLosses').textContent = s.losses; $('#hudFouls').textContent = s.fouls; $('#hudPoss').textContent = `${s.possession}%`;
}
let pipT = 0;
function updatePip(dt, intent) {
  if ($('#pip').hidden) return;
  pipT -= dt; if (pipT > 0) return; pipT = 1 / 15;
  drawPose($('#pipCanvas'));
  const st = $('#mSteer'); const w = Math.abs(intent.steer) * 50;
  st.style.width = `${w}%`; st.style.left = intent.steer >= 0 ? '50%' : `${50 - w}%`;
  $('#mRun').style.width = `${Math.round(intent.run * 100)}%`;
  const src = { feet: 'القدمين', knees: 'الركبتين', hips: 'الورك', none: '—' }[body.source];
  $('#pipStatus').textContent = tracker.tracking ? `يتتبع ${src} • ${Math.round(tracker.fps)} fps • ${tracker.delegate}` : '⚠ لا أرى جسمك';
}

// ---------- Main loop ----------
let last = performance.now(), lostT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now / 1000;

  let intent = { steer: 0, run: 0, depth: 0, events: [] };
  if (mode === 'cam' && modelReady && phase !== 'menu' && phase !== 'results') {
    tracker.update();
    if (phase === 'calib') calibStep(dt);
    else {
      body.update(tracker.points, t);
      const ev = body.drain();
      intent = { steer: body.steer, run: body.run, depth: body.depth, events: ev };
      for (const e of ev) if (e.type === 'handsUp') { phase === 'play' ? pause() : resume(); }
      intent.events = ev.filter((e) => e.type !== 'handsUp');
      // Lost tracking for >2.5 s during play → auto-pause.
      if (phase === 'play' && !tracker.tracking) { lostT += dt; if (lostT > 2.5) { lostT = 0; pause(); ui.flashSmall('لا أرى جسمك — تم الإيقاف المؤقت', 'warn'); } }
      else lostT = 0;
    }
  }
  // Keyboard/touch always available (also as backup in camera mode).
  const fb = fallback.read(dt);
  if (fallback.enabled && phase === 'play') {
    if (Math.abs(fb.steer) > Math.abs(intent.steer)) intent.steer = fb.steer;
    if (fb.run > intent.run) intent.run = fb.run;
    if (fb.depth) intent.depth = fb.depth;
    intent.events = intent.events.concat(fb.events);
  }

  if (phase === 'play') { game.update(dt, intent); updateHud(dt); }
  else if (phase === 'menu') idleCamera(t);
  updatePip(dt, intent);
  world.adapt(dt);
  world.render();
}

// Slow orbit behind the menu
function idleCamera(t) {
  world.camera.position.set(Math.sin(t * 0.1) * 26, 11, -18 + Math.cos(t * 0.1) * 30);
  world.camera.lookAt(0, 0, -30);
}

// ---------- boot ----------
body.sensitivity = settings.sensitivity;
sfx.setEnabled(settings.sound);
refreshMenu();
game.newMatch(settings); game.state = 'idle'; $('#flash').className = 'flash'; // populate the scene for the menu backdrop
if (!window.isSecureContext) $('#startCam').title = 'الكاميرا تحتاج https أو localhost';
requestAnimationFrame(frame);

// Debug hook for automated tests
window.__arfd = { game, world, body, tracker, settings, get phase() { return phase; } };
