// Mirror AR lab: runs the mirror pipeline one stage at a time, each with live pass/fail checks.
import { FrontCamera, cameraErrorMessage } from './camera.js';
import { STAGES } from './stages.js';

const $ = (s) => document.querySelector(s);

export const lab = {
  video: $('#cam'),
  overlay: $('#overlay'),
  glCanvas: $('#gl'),
  camera: null,
  stage: 0,
  passed: new Set(),
  ctx: {},           // shared state between stages (pose, floor, scene, …)
  // Map normalized *mirrored* video coords (0..1) to screen pixels, matching object-fit: cover.
  videoToScreen(u, v) {
    const W = innerWidth, H = innerHeight, vw = this.video.videoWidth || 640, vh = this.video.videoHeight || 480;
    const s = Math.max(W / vw, H / vh), dw = vw * s, dh = vh * s;
    return [(W - dw) / 2 + u * dw, (H - dh) / 2 + v * dh];
  },
  metric(k, v) { this._metrics[k] = v; },
  _metrics: {},
  toast(msg, ms = 2200) {
    let el = $('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.append(el); }
    el.textContent = msg; el.hidden = false; clearTimeout(this._tt); this._tt = setTimeout(() => (el.hidden = true), ms);
  },
};
window.__lab = lab;

function resizeOverlay() { const c = lab.overlay; c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio; }
addEventListener('resize', resizeOverlay); resizeOverlay();

// ---------- stage UI ----------
function renderSteps() {
  $('#steps').innerHTML = STAGES.map((s, i) => `<span class="${i === lab.stage ? 'cur' : ''} ${lab.passed.has(i) ? 'done' : ''}" title="${s.title}">${i + 1}</span>`).join('');
}
async function enterStage(i) {
  const prev = STAGES[lab.stage];
  if (prev && prev !== STAGES[i]) prev.exit?.(lab);
  lab.stage = i; lab._metrics = {};
  const s = STAGES[i];
  $('#stageTitle').textContent = `${i + 1}. ${s.title}`;
  $('#stageHint').textContent = s.hint;
  $('#limits').innerHTML = s.limits;
  $('#stageControls').innerHTML = '';
  $('#checks').innerHTML = s.checks.map((c) => `<li>${c.label}${c.optional ? ' <small>(اختياري)</small>' : ''}</li>`).join('');
  $('#btnPrev').disabled = i === 0;
  renderSteps();
  try { await s.enter?.(lab, $('#stageControls')); } catch (e) { console.error(e); lab.toast('خطأ: ' + (e.message || e), 5000); }
}
$('#btnNext').onclick = () => { if (lab.stage < STAGES.length - 1) enterStage(lab.stage + 1); };
$('#btnPrev').onclick = () => { if (lab.stage > 0) enterStage(lab.stage - 1); };
$('#btnCollapse').onclick = () => $('#panel').classList.toggle('collapsed');

// ---------- start (user gesture: required by iOS for camera + audio) ----------
$('#btnStart').onclick = async () => {
  $('#startErr').hidden = true;
  try {
    lab.camera = new FrontCamera(lab.video);
    await lab.camera.start();
  } catch (e) {
    console.error(e);
    $('#startErr').textContent = cameraErrorMessage(e); $('#startErr').hidden = false;
    return;
  }
  $('#start').hidden = true; $('#panel').hidden = false;
  const want = Number(new URLSearchParams(location.search).get('stage')) || 1;
  // Jumping ahead still runs every earlier stage's setup, in order.
  for (let i = 0; i < want - 1 && i < STAGES.length; i++) { await STAGES[i].enter?.(lab, document.createElement('div')); STAGES[i].exit?.(lab); }
  enterStage(Math.min(want, STAGES.length) - 1);
  loop();
};

// ---------- main loop ----------
let last = performance.now(), checkT = 0;
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
  const s = STAGES[lab.stage];
  const g = lab.overlay.getContext('2d');
  g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  g.clearRect(0, 0, innerWidth, innerHeight);
  // Every stage up to the current one keeps running (they build on each other).
  for (let i = 0; i <= lab.stage; i++) STAGES[i].update?.(lab, dt, g, i === lab.stage);
  checkT -= dt;
  if (checkT <= 0) {
    checkT = 0.25;
    const lis = $('#checks').children;
    let all = true;
    s.checks.forEach((c, k) => { const r = c.test(lab); lis[k].className = r === true ? 'ok' : r === false ? 'fail' : ''; if (r !== true && !c.optional) all = false; });
    if (all) lab.passed.add(lab.stage);
    $('#btnNext').disabled = !lab.passed.has(lab.stage) || lab.stage === STAGES.length - 1;
    $('#metrics').innerHTML = Object.entries(lab._metrics).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    renderSteps();
  }
}
