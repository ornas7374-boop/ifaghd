// The six lab stages. Each: title, hint, limits (honest notes), checks[{label,test}], enter/update/exit.
// test() returns true (pass), false (fail, shown as warning) or null (not yet known).

import * as THREE from 'three';
import { PoseTracker, BodyController, BONES } from '../pose.js';
import { playKick } from '../models.js';
import { Game } from '../game.js';
import { addArenaProps } from '../arscene.js';
import { FallbackControls } from '../controls.js';
import { PITCH } from '../config.js';
import { FloorEstimator, TiltSensor } from './floor.js';
import { MirrorView, makeLifeSizePlayer, idle, PersonOccluder } from './view.js';

export const STAGES = [];
const cm = (m) => `${(m * 100).toFixed(1)} سم`;
const deg = (r) => `${THREE.MathUtils.radToDeg(r).toFixed(1)}°`;

function drawSkeleton(l, g, alpha = 0.7) {
  const r = l.ctx.tracker?.raw; if (!r) return;
  g.strokeStyle = `rgba(79,216,138,${alpha})`; g.lineWidth = 3; g.lineCap = 'round';
  for (const [i, j] of BONES) {
    if (r[i].v < 0.4 || r[j].v < 0.4) continue;
    const [x1, y1] = l.videoToScreen(r[i].x, r[i].y), [x2, y2] = l.videoToScreen(r[j].x, r[j].y);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }
}

// Draw a floor grid (size×size m, centred at cx,cz) through the estimator's projection.
function drawFloorGrid(l, g, floorY, cx, cz, color, size = 1.2, step = 0.3) {
  const F = l.ctx.floor;
  g.strokeStyle = color; g.lineWidth = 1.5;
  const seg = (a, b) => {
    const pa = F.project(a), pb = F.project(b); if (!pa || !pb) return;
    const [x1, y1] = l.videoToScreen(pa.u, pa.v), [x2, y2] = l.videoToScreen(pb.u, pb.v);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  };
  const h = size / 2;
  for (let d = -h; d <= h + 1e-6; d += step) {
    seg(new THREE.Vector3(cx + d, floorY, cz - h), new THREE.Vector3(cx + d, floorY, cz + h));
    seg(new THREE.Vector3(cx - h, floorY, cz + d), new THREE.Vector3(cx + h, floorY, cz + d));
  }
}

// ---------------- Stage 1: front camera ----------------
STAGES.push({
  title: 'الكاميرا الأمامية',
  hint: 'يجب أن ترى نفسك كالمرآة: ارفع يدك اليمنى فترتفع اليد على يمين الشاشة.',
  limits: `<ul>
    <li>الصورة معكوسة أفقياً (مرآة) عن قصد، وكل الحسابات اللاحقة تستخدم نفس الإحداثيات المعكوسة.</li>
    <li>نطلب 640×480 بمعدل 30 إطاراً: دقة أعلى تُبطئ تتبع الجسم على الآيفون دون فائدة في الدقة.</li>
    <li>على iPhone يجب أن يبدأ التشغيل بلمسة منك، والصفحة يجب أن تكون https.</li>
    <li>الكاميرا لا تُبلغ زاوية رؤيتها الحقيقية للمتصفح؛ نفترض ~64° أفقياً، وهذا مصدر خطأ في المراحل التالية.</li>
  </ul>`,
  checks: [
    { label: 'الكاميرا تعمل (البث حي)', test: (l) => l.camera?.running ?? null },
    { label: 'ليست الكاميرا الخلفية', test: (l) => (l.camera ? l.camera.info.facingMode !== 'environment' : null) },
    { label: 'الدقة ≥ 360 على الضلع الأقصر', test: (l) => (l.camera ? Math.min(l.camera.info.width, l.camera.info.height) >= 360 : null) },
    { label: 'معدل الإطارات ≥ 20 fps', test: (l) => (l.camera?.fps ? l.camera.fps >= 20 : null) },
  ],
  update(l, dt, g, current) {
    if (!current) return;
    const c = l.camera; if (!c) return;
    l.metric('الدقة', `${c.info.width}×${c.info.height}`);
    l.metric('الإطارات', `${c.fps.toFixed(1)} fps`);
    l.metric('الاتجاه', c.info.facingMode === 'unknown' ? 'غير مُبلغ (كاميرا كمبيوتر)' : c.info.facingMode);
    l.metric('الكاميرا', c.info.label || '—');
    // Mirror sanity marker: label the screen's right side.
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(innerWidth - 130, 70, 120, 32);
    g.fillStyle = '#fff'; g.font = '14px system-ui'; g.textAlign = 'center'; g.fillText('يدك اليمنى هنا ▶', innerWidth - 70, 91);
  },
});

// ---------------- Stage 2: floor, feet, calibration ----------------
STAGES.push({
  title: 'الأرضية والقدمان والمعايرة',
  hint: 'قف بحيث يظهر جسمك كاملاً من الرأس إلى القدمين، واثبت 1.5 ثانية. الشبكة الزرقاء يجب أن تبدو ملقاة على الأرض تحت قدميك.',
  limits: `<ul>
    <li><b>هذا تقدير من صورة واحدة، وليس تتبعاً للمكان.</b> لا يوجد قياس عمق ولا كشف أسطح: نستنتج الأرض من موضع قدميك ورأسك وطولك.</li>
    <li><b>الطول:</b> إذا أدخلت طولاً خاطئاً بنسبة 5% تتغير المسافة والارتفاع بنفس النسبة، لكن المحاذاة على الشاشة عند مكانك تبقى صحيحة.</li>
    <li><b>زاوية رؤية الكاميرا</b> غير متاحة للمتصفح (نفترض 66°). خطؤها يجعل الأشياء البعيدة أو القريبة منك تنحرف قليلاً عن الأرض.</li>
    <li><b>ميلان الجوال</b> أهم مصدر للخطأ: كل درجة ميلان غير محسوبة ≈ انحراف 4–5 سم في الأرض على بعد 2.5 م. استخدم المستشعر (iPhone يطلب إذناً) أو «حل الميلان بخطوتين».</li>
    <li>الأرض تُفترض مستوية وأفقية. السجاد السميك أو الدرج غير مدعوم.</li>
    <li><b>إذا تحرك الجوال بعد المعايرة تصبح المعايرة خاطئة</b> ويجب إعادتها (نحذّرك إن رصد المستشعر حركة).</li>
  </ul>`,
  checks: [
    { label: 'نموذج تتبع الجسم محمّل', test: (l) => (l.ctx.tracker?.landmarker ? true : null) },
    { label: 'الرأس والقدمان ظاهران', test: (l) => (l.ctx.floor?.last ? l.ctx.floor.last.ok || (l.ctx.floor.last.reason === 'no-person' ? null : false) : null) },
    { label: 'المعايرة اكتملت (ثبات 1.5 ث)', test: (l) => (l.ctx.floor?.result ? true : null) },
    { label: 'ثبات الأرض: تذبذب < 3 سم', test: (l) => (l.ctx.floor?.result ? l.ctx.floor.result.jitter.y < 0.03 : null) },
    { label: 'مسافة منطقية (1.2 – 5 م)', test: (l) => { const r = l.ctx.floor?.result; return r ? r.Z > 1.2 && r.Z < 5 : null; } },
    { label: 'ارتفاع الجوال منطقي (0.2 – 2 م)', test: (l) => { const r = l.ctx.floor?.result; return r ? -r.floorY > 0.2 && -r.floorY < 2 : null; } },
    { label: 'الميلان مقاس (مستشعر أو خطوتين)', optional: true, test: (l) => (l.ctx.floor ? l.ctx.floor.pitchSource !== 'assumed' : null) },
  ],
  async enter(l, ui) {
    const c = l.ctx;
    c.floor ||= new FloorEstimator();
    c.tilt ||= new TiltSensor();
    c.floor.setVideo(l.video.videoWidth, l.video.videoHeight);
    ui.innerHTML = `
      <label>طولك: <b id="hOut"></b><input type="range" id="hIn" min="120" max="210" step="1"></label>
      <label>زاوية رؤية الكاميرا (تقديرية): <b id="fOut"></b><input type="range" id="fIn" min="50" max="85" step="1"></label>
      <label>ميلان الجوال: <b id="pOut"></b><input type="range" id="pIn" min="-25" max="25" step="0.5"></label>
      <div class="row">
        <button class="ghost sm" id="bTilt">استخدم مستشعر الميلان</button>
        <button class="ghost sm" id="bTwo">حل الميلان بخطوتين</button>
        <button class="ghost sm" id="bRe">أعد المعايرة</button>
      </div>`;
    const F = c.floor;
    const sync = () => { ui.querySelector('#hOut').textContent = `${Math.round(F.userHeight * 100)} سم`; ui.querySelector('#fOut').textContent = `${F.hfovDeg}°`; ui.querySelector('#pOut').textContent = `${deg(F.pitch)} (${{ assumed: 'مفترض', sensor: 'مستشعر', solved: 'محسوب بخطوتين', manual: 'يدوي' }[F.pitchSource]})`; };
    const hIn = ui.querySelector('#hIn'), fIn = ui.querySelector('#fIn'), pIn = ui.querySelector('#pIn');
    hIn.value = Math.round(F.userHeight * 100); fIn.value = F.hfovDeg; pIn.value = THREE.MathUtils.radToDeg(F.pitch);
    const recal = () => { F.result = null; F.samples.length = 0; };
    hIn.oninput = () => { F.userHeight = hIn.value / 100; recal(); sync(); };
    fIn.oninput = () => { F.hfovDeg = +fIn.value; recal(); sync(); };
    pIn.oninput = () => { F.pitch = THREE.MathUtils.degToRad(+pIn.value); F.pitchSource = 'manual'; c.useSensor = false; recal(); sync(); };
    ui.querySelector('#bRe').onclick = () => { recal(); c.twoStep = null; };
    ui.querySelector('#bTilt').onclick = async () => {
      const ok = await c.tilt.start();
      if (!ok) l.toast('المستشعر غير متاح أو رُفض الإذن (شائع على الكمبيوتر).');
      else { c.useSensor = true; l.toast('سيُستخدم ميلان الجوال من المستشعر.'); }
    };
    ui.querySelector('#bTwo').onclick = () => { c.twoStep = { phase: 'A' }; recal(); l.toast('قف ثابتاً في مكانك الأول…', 2500); };
    c.syncFloorUI = sync; sync();

    if (!c.tracker) {
      c.tracker = new PoseTracker(l.video);
      l.metric('النموذج', 'جاري التحميل…');
      await c.tracker.loadModel();
    }
  },
  update(l, dt, g, current) {
    const c = l.ctx, F = c.floor, T = c.tracker;
    if (!T?.landmarker) return;
    T.update();
    if (c.useSensor && c.tilt.available) { F.pitch = c.tilt.pitch; F.pitchSource = 'sensor'; }
    if (c.tilt.available && F.result && c.tilt.moved > THREE.MathUtils.degToRad(2.5)) { l.toast('تحرك الجوال بعد المعايرة: أعد المعايرة.', 3000); c.tilt.moved = 0; }
    const e = F.estimate(T.raw);
    if (!current && F.result) return;
    if (current) drawSkeleton(l, g, 0.5);

    // Two-step pitch solve: calibrate at position A, then step ~1 m back/forward to B.
    if (c.twoStep && e.ok) {
      const ts = c.twoStep;
      // Stillness in wall-clock time (frame dt is capped, so it under-counts on slow devices).
      const now = performance.now();
      if (!ts.ref || Math.abs(ts.ref.x - e.X) > 0.1 || Math.abs(ts.ref.z - e.Z) > 0.2) { ts.ref = { x: e.X, z: e.Z }; ts.since = now; }
      ts.still = (now - ts.since) / 1000;
      if (ts.phase === 'A' && ts.still > 1.5) { ts.rawA = T.raw.map((p) => ({ ...p })); ts.zA = e.Z; ts.phase = 'B'; ts.ref = null; l.toast('ممتاز. الآن خطوة كبيرة للخلف أو للأمام واثبت…', 3000); }
      else if (ts.phase === 'B' && ts.still > 1.5 && Math.abs(e.Z - ts.zA) > 0.6) {
        const sol = F.solvePitch(ts.rawA, T.raw);
        if (sol && sol.err < 0.03) { F.pitch = THREE.MathUtils.degToRad(sol.deg); F.pitchSource = 'solved'; c.useSensor = false; l.toast(`الميلان المحسوب: ${sol.deg.toFixed(1)}°`, 3000); }
        else l.toast('تعذّر حساب الميلان بدقة. جرّب خطوة أكبر.', 3000);
        c.twoStep = null; F.result = null; F.samples.length = 0; c.syncFloorUI?.();
      }
    }

    if (!F.result && !c.twoStep) {
      const p = F.addSample(e, dt);
      l.metric('المعايرة', `${Math.round(p * 100)}%`);
      if (p >= 1) { F.finish(); c.tilt.lockReference(); l.toast('تمت المعايرة ✓'); }
    }
    if (!current) return;

    // Live estimate (green) vs calibrated floor (blue)
    if (e.ok) {
      for (const f of e.feet) { const pr = F.project(new THREE.Vector3(f.x, e.floorY, f.z)); if (pr) { const [x, y] = l.videoToScreen(pr.u, pr.v); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); } }
      if (!F.result) drawFloorGrid(l, g, e.floorY, e.X, e.feet[0].z, 'rgba(79,216,138,.8)');
    }
    const r = F.result;
    if (r) drawFloorGrid(l, g, r.floorY, r.X, r.Z * -1, 'rgba(63,167,255,.95)', 1.8, 0.3);
    l.metric('مصدر القدم', e.ok ? (e.footSource === 'heels' ? 'الكعبان' : 'الكاحلان') : ({ 'no-person': 'لا يوجد شخص', 'no-head': 'الرأس غير ظاهر', 'no-feet': 'القدمان غير ظاهرتين', 'bad-geometry': 'وضعية غير قائمة' }[e.reason] || e.reason));
    if (e.ok) { l.metric('المسافة الآن', `${e.Z.toFixed(2)} م`); l.metric('ارتفاع الجوال الآن', `${(-e.floorY).toFixed(2)} م`); }
    if (r) {
      l.metric('المسافة (معايرة)', `${r.Z.toFixed(2)} م ± ${cm(r.jitter.z)}`);
      l.metric('ارتفاع الجوال', `${(-r.floorY).toFixed(2)} م ± ${cm(r.jitter.y)}`);
      l.metric('الموضع الأفقي', `${r.X.toFixed(2)} م`);
    }
    l.metric('الميلان', `${deg(F.pitch)} (${F.pitchSource})`);
    l.metric('تتبع الجسم', `${T.fps.toFixed(0)} fps • ${T.inferMs.toFixed(0)} ms • ${T.delegate}`);
  },
});

// ---------------- Stage 3: a life-size 3D player beside you ----------------
function screenOf3D(l, v) { // three.js camera projection → screen px
  const p = v.clone().project(l.ctx.view.camera);
  return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight, p.z];
}
function placePlayer(l) {
  const c = l.ctx, r = c.floor.result, pl = c.player;
  if (!r || !pl) return false;
  const side = c.side ?? (r.X < 0 ? 1 : -1);
  pl.position.set(r.X + side * c.gap, 0, -r.Z + c.depthOff);
  pl.rotation.y = Math.PI; // face the camera (you)
  c.view.aimLight(pl.position.x, pl.position.z);
  return true;
}
STAGES.push({
  title: 'لاعب 3D بجانبك',
  hint: 'يجب أن يظهر لاعب بحجم إنسان واقفاً على أرض غرفتك بجانبك، وقدماه على نفس مستوى قدميك. حرّك المنزلقات لتغيير مكانه.',
  limits: `<ul>
    <li><b>هو صورة مرسومة فوق الكاميرا، وليس مثبتاً بتتبع للمكان.</b> يبقى في مكانه فقط لأن الجوال ثابت. إذا تحرك الجوال يتحرك اللاعب معه ويجب إعادة المعايرة.</li>
    <li><b>لا حجب (Occlusion):</b> إذا مررت أمامه يبقى مرسوماً فوقك. لا نعرف عمق الأشياء الحقيقية.</li>
    <li><b>الظل:</b> اتجاه الضوء مفترض (من الأعلى والأمام)، وليس مقاساً من غرفتك. شدة الضوء ولونه فقط مأخوذان من الصورة. لذلك قد لا يتطابق ظله مع ظلك.</li>
    <li><b>المظهر:</b> نموذج بسيط بأشكال هندسية، لا خامات واقعية ولا انعكاسات؛ سيبدو «لعبة» فوق صورة حقيقية.</li>
    <li>دقة وقوفه على الأرض = دقة معايرة المرحلة 2 (حوالي 2–3 سم مع ميلان مقاس، وأكثر بكثير بدونه).</li>
  </ul>`,
  checks: [
    { label: 'معايرة الأرض موجودة (المرحلة 2)', test: (l) => (l.ctx.floor?.result ? true : false) },
    { label: 'اللاعب ظاهر داخل الشاشة', test: (l) => l.ctx.s3?.visible ?? null },
    { label: 'كاميرا العرض = كاميرا القياس (فرق < 3 بكسل)', test: (l) => (l.ctx.s3?.camErr != null ? l.ctx.s3.camErr < 3 : null) },
    { label: 'الأرض المعايرة ما زالت تحت قدميك (< 15 بكسل)', test: (l) => (l.ctx.s3?.feetErr != null ? l.ctx.s3.feetErr < 15 : null) },
    { label: 'العرض ≥ 24 إطاراً/ث', test: (l) => (l.ctx.s3?.fps ? l.ctx.s3.fps >= 24 : null) },
  ],
  enter(l, ui) {
    const c = l.ctx;
    c.view ||= new MirrorView(l.glCanvas);
    c.gap ??= 0.9; c.depthOff ??= 0; c.sizeK ??= 1;
    if (!c.player) { c.player = makeLifeSizePlayer(c.floor.userHeight); c.view.world.add(c.player); }
    c.player.visible = true;
    c.s3 = { frames: 0, t0: performance.now() };
    ui.innerHTML = `
      <label>المسافة الجانبية: <b id="gOut"></b><input type="range" id="gIn" min="0.5" max="2.5" step="0.05"></label>
      <label>أمامك / خلفك: <b id="dOut"></b><input type="range" id="dIn" min="-1.2" max="2" step="0.05"></label>
      <label>الطول نسبةً لطولك: <b id="kOut"></b><input type="range" id="kIn" min="0.6" max="1.3" step="0.02"></label>
      <div class="row"><button class="ghost sm" id="bSide">بدّل الجهة</button></div>
      <label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="occIn"> جسمك يحجب ما خلفه (تجريبي، يكلّف أداءً)</label>`;
    const sync = () => { ui.querySelector('#gOut').textContent = `${c.gap.toFixed(2)} م`; ui.querySelector('#dOut').textContent = `${c.depthOff >= 0 ? 'أقرب للكاميرا' : 'أبعد'} ${Math.abs(c.depthOff).toFixed(2)} م`; ui.querySelector('#kOut').textContent = `${Math.round(c.sizeK * 100)}%`; };
    const gIn = ui.querySelector('#gIn'), dIn = ui.querySelector('#dIn'), kIn = ui.querySelector('#kIn');
    gIn.value = c.gap; dIn.value = c.depthOff; kIn.value = c.sizeK;
    gIn.oninput = () => { c.gap = +gIn.value; sync(); };
    dIn.oninput = () => { c.depthOff = +dIn.value; sync(); };
    kIn.oninput = () => { c.sizeK = +kIn.value; sync(); };
    c.occluder ||= new PersonOccluder(c.view);
    const occIn = ui.querySelector('#occIn'); occIn.checked = c.occluder.enabled;
    occIn.onchange = async () => { c.occluder.enabled = occIn.checked; c.maskBadT = 0; await c.tracker.setMask(occIn.checked); };
    const cpuBtn = document.createElement('button'); cpuBtn.className = 'ghost sm'; cpuBtn.id = 'bCpu'; cpuBtn.hidden = true;
    cpuBtn.textContent = 'جرّب الحجب بالمعالج CPU (أبطأ)';
    cpuBtn.onclick = async () => { const T = c.tracker; T.landmarker.close(); T.landmarker = null; T.maskOn = false; await T.loadModel('CPU'); await T.setMask(true); c.maskBadT = 0; cpuBtn.hidden = true; };
    ui.append(cpuBtn); c.cpuBtn = cpuBtn;
    ui.querySelector('#bSide').onclick = () => { const r = c.floor.result; c.side = -(c.side ?? (r?.X < 0 ? 1 : -1)); };
    sync();
  },
  exit(l) { /* keep the player for later stages */ },
  update(l, dt, g, current) {
    const c = l.ctx, F = c.floor, r = F.result;
    if (!c.view) return;
    c.view.fit(F, l.video);
    c.view.updateLight(l.video, dt);
    if (!r) { c.player.visible = false; return; }
    c.view.setFloor(r.floorY);
    const pl = c.player;
    pl.visible = l.stage <= 2 || c.keepSidePlayer !== false;
    pl.scale.setScalar((F.userHeight * c.sizeK) / pl.userData.natH);
    if (l.stage === 2) { placePlayer(l); idle(pl, dt, 0); }
    if (c.occluder) {
      const e = F.last, dist = (e?.ok ? e.Z : r.Z) / Math.cos(F.pitch);
      // Mask health: a tracked body with an empty mask for 2 s means the GPU readback isn't working here.
      if (c.occluder.enabled && c.tracker.tracking && c.tracker.mask && c.tracker.mask.coverage === 0) c.maskBadT = (c.maskBadT || 0) + dt; else c.maskBadT = 0;
      c.maskBroken = c.maskBadT > 2;
      if (c.cpuBtn) c.cpuBtn.hidden = !(c.maskBroken && c.tracker.delegate === 'GPU');
      c.occluder.update(c.tracker.mask, dist, l.video);
    }
    if (!current) return;
    // --- checks ---
    const s3 = c.s3; s3.frames++;
    const now = performance.now(); if (now - s3.t0 > 1000) { s3.fps = s3.frames * 1000 / (now - s3.t0); s3.frames = 0; s3.t0 = now; }
    const foot = new THREE.Vector3(pl.position.x, r.floorY, pl.position.z);
    const head = foot.clone().add(new THREE.Vector3(0, F.userHeight * c.sizeK, 0));
    const [fx, fy] = screenOf3D(l, foot), [hx, hy] = screenOf3D(l, head);
    s3.visible = fy > 0 && hy < innerHeight && fx > -50 && fx < innerWidth + 50;
    const pf = F.project(foot); const [mx, my] = l.videoToScreen(pf.u, pf.v);
    s3.camErr = Math.hypot(mx - fx, my - fy);
    const e = F.last;
    if (e?.ok) {
      // project the CALIBRATED floor at your CURRENT feet position, compare with where your heels are now
      const footH = e.footSource === 'heels' ? 0.03 : 0.075;
      const pc = F.project(new THREE.Vector3(e.X, r.floorY + footH, -e.Z));
      const [, cy] = l.videoToScreen(pc.u, pc.v);
      const [, uy] = l.videoToScreen(0.5, e.footV);
      s3.feetErr = Math.abs(cy - uy);
      g.strokeStyle = 'rgba(255,210,63,.9)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(0, cy); g.lineTo(innerWidth, cy); g.stroke(); g.setLineDash([]);
    }
    l.metric('مكان اللاعب', `x=${pl.position.x.toFixed(2)} z=${pl.position.z.toFixed(2)} م`);
    l.metric('طول اللاعب على الشاشة', `${Math.round(fy - hy)} px`);
    l.metric('فرق الكاميرتين', `${s3.camErr.toFixed(2)} px`);
    l.metric('انحراف الأرض عن قدميك', s3.feetErr != null ? `${s3.feetErr.toFixed(1)} px` : '—');
    l.metric('الإضاءة المقدرة', `سطوع ${(c.view.lum * 100).toFixed(0)}%`);
    l.metric('العرض', `${(s3.fps || 0).toFixed(0)} fps • ${c.view.frameMs.toFixed(1)} ms`);
    l.metric('الحجب', c.maskBroken ? '✗ القناع فارغ على هذا الجهاز (GPU)' : c.occluder?.enabled ? (c.tracker.mask ? `يعمل • قناع ${c.tracker.mask.w}×${c.tracker.mask.h} • تتبع ${c.tracker.inferMs.toFixed(0)} ms` : 'بانتظار القناع…') : 'متوقف');
  },
});

// ---------------- Stage 4: body tracking drives the player ----------------
STAGES.push({
  title: 'تتبع الجسم',
  hint: 'اللاعب يقلّدك الآن: اجرِ في مكانك فيجري، تحرّك يميناً ويساراً فيتحرك، ارفع قدمك بقوة فيركل، وبدّل الاتجاه بسرعة للتمويه.',
  limits: `<ul>
    <li><b>التأخير:</b> بين حركتك وحركة اللاعب زمن الإطار (33 ms) + زمن التتبع (يظهر أدناه) + التنعيم (~30–60 ms). على الآيفون المتوقع 80–150 ms إجمالاً.</li>
    <li>تتبع ثنائي الأبعاد من كاميرا واحدة: الحركة نحو الكاميرا تُقاس من تغيّر حجم الجسم فقط، وهي أقل دقة من الحركة الجانبية.</li>
    <li>الركلة تُكشف من ارتفاع القدم وسرعتها، وليس من اتجاهها. الركلة الجانبية الخفيفة قد لا تُكشف.</li>
    <li>الملابس الواسعة والإضاءة الخافتة والخلفية المزدحمة تقلّل الدقة؛ القدمان أول ما يضيع.</li>
    <li>شخص واحد فقط: إذا دخل شخص آخر قد ينتقل التتبع إليه.</li>
  </ul>`,
  checks: [
    { label: 'معايرة وضع الجسم المحايد', test: (l) => (l.ctx.body?.calib ? true : null) },
    { label: 'التتبع ≥ 15 إطاراً/ث', test: (l) => (l.ctx.tracker?.fps ? l.ctx.tracker.fps >= 15 : null) },
    { label: 'رُصد الجري في المكان', test: (l) => l.ctx.s4?.seen.run || null },
    { label: 'رُصدت حركة لليمين', test: (l) => l.ctx.s4?.seen.right || null },
    { label: 'رُصدت حركة لليسار', test: (l) => l.ctx.s4?.seen.left || null },
    { label: 'رُصدت ركلة', test: (l) => l.ctx.s4?.seen.kick || null },
    { label: 'رُصد تمويه', optional: true, test: (l) => l.ctx.s4?.seen.feint || null },
  ],
  enter(l, ui) {
    const c = l.ctx;
    c.body ||= new BodyController();
    c.body.reset(); c.body.sensitivity = c.sens ?? 1;
    c.s4 = { seen: {}, x: 0, events: [] };
    ui.innerHTML = `<label>حساسية التتبع: <b id="sOut"></b><input type="range" id="sIn" min="0.5" max="2" step="0.05"></label>
      <div class="row"><button class="ghost sm" id="bRe4">أعد معايرة الوضع المحايد</button></div>`;
    const sIn = ui.querySelector('#sIn'), sync = () => (ui.querySelector('#sOut').textContent = `×${(+sIn.value).toFixed(2)}`);
    sIn.value = c.body.sensitivity; sIn.oninput = () => { c.body.sensitivity = c.sens = +sIn.value; sync(); }; sync();
    ui.querySelector('#bRe4').onclick = () => { c.body.reset(); c.body.sensitivity = c.sens ?? 1; };
  },
  update(l, dt, g, current) {
    const c = l.ctx, B = c.body, T = c.tracker, s4 = c.s4;
    if (!B || !current) return;
    if (!c.floor?.result || !c.player) { l.metric('تنبيه', 'أكمل معايرة الأرض (المرحلة 2) أولاً'); drawSkeleton(l, g, 0.6); return; }
    const t = performance.now() / 1000;
    if (!B.calib) {
      // wall-clock step: frame dt is capped at 50 ms, which would slow calibration on slow devices
      const now = performance.now(), rdt = Math.min(0.3, (now - (s4.lastCal || now)) / 1000); s4.lastCal = now;
      const p = B.calibrate(T.points, rdt);
      l.metric('معايرة الوضع', `${Math.round(p * 100)}%`);
      drawSkeleton(l, g, 0.6);
      return;
    }
    B.update(T.points, t);
    for (const e of B.drain()) {
      s4.events.unshift(`${{ touch: 'لمسة', kick: 'ركلة', feint: 'تمويه', handsUp: 'يدان' }[e.type]}${e.foot ? ' ' + e.foot : ''}${e.dir ? (e.dir > 0 ? ' →' : ' ←') : ''}`); s4.events.length = Math.min(s4.events.length, 6);
      if (e.type === 'kick') { s4.seen.kick = true; playKick(c.player.userData.model, e.foot === 'L' ? -1 : 1); }
      if (e.type === 'feint') { s4.seen.feint = true; s4.vx = (s4.vx || 0) + e.dir * 1.5; }
    }
    if (B.run > 0.5) s4.seen.run = true;
    if (B.steer > 0.6) s4.seen.right = true;
    if (B.steer < -0.6) s4.seen.left = true;
    // Player mirrors you: lateral velocity from steer, running animation from cadence.
    s4.vx = (s4.vx || 0) + (B.steer * 2.0 - (s4.vx || 0)) * Math.min(1, dt * 8);
    s4.x = Math.max(-1.5, Math.min(1.5, s4.x + s4.vx * dt));
    const pl = c.player;
    placePlayer(l); pl.position.x += s4.x;
    // never stand inside you: keep ≥ 0.6 m from your live position (same depth assumed)
    const e = c.floor.last;
    if (e?.ok) { const d = pl.position.x - e.X; if (Math.abs(d) < 0.6) pl.position.x = e.X + (Math.sign(d) || 1) * 0.6; }
    idle(pl, dt, B.run * 5 + Math.abs(s4.vx), { tilt: -B.steer });
    drawSkeleton(l, g, 0.35);
    l.metric('اتجاه', B.steer.toFixed(2)); l.metric('جري', B.run.toFixed(2)); l.metric('عمق', B.depth.toFixed(2));
    l.metric('مصدر الخطوات', { feet: 'القدمان', knees: 'الركبتان', hips: 'الورك', none: '—' }[B.source]);
    l.metric('آخر الأحداث', s4.events.join(' • ') || '—');
    l.metric('تتبع الجسم', `${T.fps.toFixed(0)} fps • ${T.inferMs.toFixed(0)} ms • ${T.delegate}`);
  },
});

// ---------------- Stage 5: defenders, ball and collisions (existing game system) ----------------
function flashEl() {
  let el = document.querySelector('#labFlash');
  if (!el) { el = document.createElement('div'); el.id = 'labFlash'; el.className = 'lab-flash'; document.body.append(el); }
  return el;
}
function placeArena(l) {
  const c = l.ctx, r = c.floor.result, A = c.arena;
  if (!r || !A) return false;
  const s = c.arenaScale;
  const side = c.side ?? (r.X < 0 ? 1 : -1);
  // kick-off spot beside you (where the stage-3 player stood); the goal further into the room
  A.position.set(r.X + side * c.gap, 0, -r.Z - PITCH.startZ * s);
  A.scale.setScalar(s);
  A.updateMatrixWorld(true);
  const sc = c.view.sun.shadow.camera, e = 5.5 * s + 1;
  sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.far = 30; sc.updateProjectionMatrix();
  c.view.sun.position.set(A.position.x - 1.5, 4, A.position.z + 2.5);
  c.view.sun.target.position.set(A.position.x, c.view.world.position.y, A.position.z);
  return true;
}
STAGES.push({
  title: 'المدافعون والكرة والتصادمات',
  hint: 'الملعب يوضع على أرضك بجانبك والمرمى أبعد داخل الغرفة. اجرِ في مكانك لتتقدم بالكرة، تحرك يميناً ويساراً لتراوغ، وارفع قدمك للتسديد. (على الكمبيوتر: WASD / الأسهم + مسافة)',
  limits: `<ul>
    <li><b>التصادمات افتراضية فقط:</b> بين اللاعب الافتراضي والمدافعين والكرة داخل المحاكاة. جسمك الحقيقي لا يصطدم بهم ولا يمنعهم.</li>
    <li>الملعب الافتراضي أكبر من معظم الغرف؛ أجزاؤه البعيدة تُرسم «داخل» الجدار لأنه لا يوجد حجب. صغّر الحجم لتقليل ذلك.</li>
    <li>الظلال على الأرض من ضوء افتراضي واحد؛ لا تتأثر بأثاث الغرفة ولا تسقط عليه.</li>
    <li>كل شيء صحيح فقط ما دام الجوال لم يتحرك منذ المعايرة.</li>
  </ul>`,
  checks: [
    { label: 'الملعب موضوع على الأرض المعايرة', test: (l) => (l.ctx.arena?.visible && l.ctx.floor?.result ? true : null) },
    { label: 'وضع الجسم المحايد معاير', test: (l) => (l.ctx.body?.calib ? true : null) },
    { label: 'المباراة تعمل', test: (l) => (l.ctx.game ? ['play', 'countdown', 'dead'].includes(l.ctx.game.state) : null) },
    { label: 'المدافعون يتحركون', test: (l) => l.ctx.s5?.defMoved || null },
    { label: 'حدث تدخل / تصادم', test: (l) => l.ctx.s5?.tackles > 0 || null },
    { label: 'المحاكاة + العرض ≥ 24 إطاراً/ث', test: (l) => (l.ctx.s5?.fps ? l.ctx.s5.fps >= 24 : null) },
  ],
  enter(l, ui) {
    const c = l.ctx;
    c.arenaScale ??= 0.5; c.gap ??= 0.9;
    c.body ||= new BodyController();
    c.s5 = { tackles: 0, msgs: [], frames: 0, t0: performance.now() };
    if (!c.arena) {
      c.arena = new THREE.Group(); c.view.world.add(c.arena);
      addArenaProps(c.arena);
      const flash = flashEl();
      const ui5 = {
        flash(msg, kind = 'info', time = 1.2) { flash.textContent = msg; flash.className = `lab-flash show ${kind}`; clearTimeout(ui5._t); ui5._t = setTimeout(() => flash.classList.remove('show'), time * 1000); c.s5.msgs.unshift(msg); c.s5.msgs.length = Math.min(5, c.s5.msgs.length); },
        flashSmall(msg) { if (msg.includes('تدخّل')) c.s5.tackles++; c.s5.msgs.unshift(msg); c.s5.msgs.length = Math.min(5, c.s5.msgs.length); },
        onMatchOver(s) { l.toast(`انتهت الجولة: ${s.goals} أهداف، ${s.dribbles} مراوغات، ${s.losses} كرات ضائعة`, 5000); },
      };
      c.game = new Game(c.arena, l.sfx, ui5);
      c.keys = new FallbackControls(document);
    }
    c.arena.visible = true;
    c.keys.enabled = true;
    c.keepSidePlayer = false;
    c.settings5 ||= { difficulty: 'medium', defenders: 3, speedMul: 1, roundSec: 120, goalkeeper: true };
    c.game.newMatch(c.settings5);
    l.sfx?.startCrowd();
    ui.innerHTML = `
      <label>حجم الملعب: <b id="aOut"></b><input type="range" id="aIn" min="0.25" max="1" step="0.05"></label>
      <label>الصعوبة <select id="dIn"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
      <label>عدد المدافعين: <b id="nOut"></b><input type="range" id="nIn" min="1" max="5" step="1"></label>
      <div class="row"><button class="ghost sm" id="bRestart">جولة جديدة</button></div>`;
    const aIn = ui.querySelector('#aIn'), dIn = ui.querySelector('#dIn'), nIn = ui.querySelector('#nIn');
    const sync = () => { ui.querySelector('#aOut').textContent = `${Math.round(c.arenaScale * 100)}%`; ui.querySelector('#nOut').textContent = c.settings5.defenders; };
    aIn.value = c.arenaScale; dIn.value = c.settings5.difficulty; nIn.value = c.settings5.defenders;
    aIn.oninput = () => { c.arenaScale = +aIn.value; sync(); };
    dIn.onchange = () => { c.settings5.difficulty = dIn.value; c.game.newMatch(c.settings5); };
    nIn.oninput = () => { c.settings5.defenders = +nIn.value; c.game.newMatch(c.settings5); sync(); };
    ui.querySelector('#bRestart').onclick = () => c.game.newMatch(c.settings5);
    sync();
  },
  exit(l, to) {
    const c = l.ctx;
    if (to === 5) return; // the performance stage measures the running game
    if (c.arena) c.arena.visible = false;
    if (c.game) c.game.state = 'idle';
    if (c.keys) c.keys.enabled = false;
    c.keepSidePlayer = true;
    l.sfx?.stopCrowd();
  },
  update(l, dt, g, current) {
    const c = l.ctx, B = c.body, T = c.tracker, s5 = c.s5;
    if (!c.game || (l.stage !== 4 && l.stage !== 5)) return; // runs in stage 5 and keeps running in stage 6
    if (!c.floor?.result) { l.metric('تنبيه', 'أكمل معايرة الأرض (المرحلة 2) أولاً'); c.arena.visible = false; return; }
    c.arena.visible = true; c.player.visible = false;
    placeArena(l);
    let intent = { steer: 0, run: 0, depth: 0, events: [] };
    const now = performance.now(), t = now / 1000;
    if (!B.calib) {
      const rdt = Math.min(0.3, (now - (s5.lastCal || now)) / 1000); s5.lastCal = now;
      const p = B.calibrate(T.points, rdt); l.metric('معايرة الوضع', `${Math.round(p * 100)}%`);
    } else {
      B.update(T.points, t);
      intent = { steer: B.steer, run: B.run, depth: B.depth, events: B.drain().filter((e) => e.type !== 'handsUp') };
    }
    const fb = c.keys.read(dt);
    if (Math.abs(fb.steer) > Math.abs(intent.steer)) intent.steer = fb.steer;
    if (fb.run > intent.run) intent.run = fb.run;
    if (fb.depth) intent.depth = fb.depth;
    intent.events = intent.events.concat(fb.events);
    const tSim = performance.now();
    c.game.update(dt, intent);
    s5.simMs = (s5.simMs || 0) * 0.9 + (performance.now() - tSim) * 0.1;
    if (c.game.defenders.some((d) => d.speed > 0.3)) s5.defMoved = true;
    s5.frames++; if (now - s5.t0 > 1000) { s5.fps = s5.frames * 1000 / (now - s5.t0); s5.frames = 0; s5.t0 = now; }
    if (!current) return;
    drawSkeleton(l, g, 0.25);
    const st = c.game.summary();
    l.metric('الوقت', `${Math.ceil(c.game.timeLeft)} ث`);
    l.metric('أهداف / مراوغات', `${st.goals} / ${st.dribbles}`);
    l.metric('كرات ضائعة / أخطاء لك', `${st.losses} / ${st.fouls}`);
    l.metric('تدخلات', s5.tackles);
    l.metric('آخر الأحداث', s5.msgs.join(' • ') || '—');
    l.metric('المحاكاة', `${s5.simMs.toFixed(2)} ms`);
    l.metric('الإطارات', `${(s5.fps || 0).toFixed(0)} fps`);
  },
});

// ---------------- Stage 6: performance (built for testing on a real iPhone) ----------------
const pct = (a, q) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
function deviceInfo(l) {
  const gl = l.ctx.view?.renderer.getContext();
  const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
  const ua = navigator.userAgent;
  return {
    ua, iOS: /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : (gl?.getParameter(gl.RENDERER) || '?'),
    screen: `${innerWidth}×${innerHeight} @${devicePixelRatio}x`, cores: navigator.hardwareConcurrency || '?',
    video: `${l.video.videoWidth}×${l.video.videoHeight}`, delegate: l.ctx.tracker?.delegate,
  };
}
STAGES.push({
  title: 'الأداء',
  hint: 'شغّل «اختبار 20 ثانية» أثناء اللعب (العب فعلاً أمام الكاميرا). على الآيفون: أغلق وضع توفير الطاقة، وكرر الاختبار بعد 3 دقائق لرصد السخونة. ثم انسخ التقرير وأرسله.',
  limits: `<ul>
    <li><b>لم يُختبر على iPhone حقيقي حتى الآن.</b> بيئة التطوير هنا بلا GPU ولا Safari؛ الأرقام فيها (2–6 fps) لا تمثل الجوال. هذه المرحلة مصممة لتقيس على جهازك وتعطيك تقريراً.</li>
    <li>تتبع الجسم يعمل على نفس الخيط (Main thread) مع الرسم: كل ms في التتبع تُخصم من وقت الإطار.</li>
    <li>الحجب يضيف قراءة قناع من GPU كل إطار — قد يكون أغلى بند على الآيفون.</li>
    <li>Safari يحدّ الأداء في «وضع توفير الطاقة» وعند السخونة، وقد يخفض معدل الكاميرا تلقائياً.</li>
  </ul>`,
  checks: [
    { label: 'تم تشغيل الاختبار', test: (l) => (l.ctx.bench?.done ? true : null) },
    { label: 'الإطارات (الوسيط) ≥ 30 fps', test: (l) => (l.ctx.bench?.done ? l.ctx.bench.r.fpsP50 >= 30 : null) },
    { label: 'أسوأ 5% من الإطارات ≤ 50 ms', test: (l) => (l.ctx.bench?.done ? l.ctx.bench.r.frameP95 <= 50 : null) },
    { label: 'تتبع الجسم ≥ 15 fps', test: (l) => (l.ctx.bench?.done ? l.ctx.bench.r.poseFps >= 15 : null) },
    { label: 'زمن التتبع (الوسيط) ≤ 35 ms', test: (l) => (l.ctx.bench?.done ? l.ctx.bench.r.inferP50 <= 35 : null) },
  ],
  enter(l, ui) {
    const c = l.ctx;
    c.perf = { frames: [], infer: [], lastV: -1, last: performance.now() };
    ui.innerHTML = `
      <label>دقة الرسم (Pixel ratio): <b id="prOut"></b><input type="range" id="prIn" min="0.5" max="2" step="0.25"></label>
      <label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="shIn"> الظلال</label>
      <label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="autoIn" checked> خفض الجودة تلقائياً عند البطء</label>
      <div class="row">
        <button class="primary" id="bBench">اختبار 20 ثانية</button>
        <button class="ghost sm" id="bCopy" disabled>انسخ التقرير</button>
      </div>
      <textarea id="report" readonly rows="6" style="width:100%;font:11px monospace;direction:ltr;background:#0c1820;color:#cfe;border:1px solid #234;border-radius:8px" hidden></textarea>`;
    const R = c.view.renderer;
    const prIn = ui.querySelector('#prIn'), shIn = ui.querySelector('#shIn');
    const sync = () => (ui.querySelector('#prOut').textContent = `${R.getPixelRatio().toFixed(2)}`);
    prIn.value = R.getPixelRatio(); shIn.checked = R.shadowMap.enabled;
    prIn.oninput = () => { R.setPixelRatio(+prIn.value); c.view.resize(); sync(); };
    shIn.onchange = () => { R.shadowMap.enabled = shIn.checked; c.view.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); };
    ui.querySelector('#autoIn').onchange = (e) => (c.autoQ = e.target.checked); c.autoQ = true;
    ui.querySelector('#bBench').onclick = () => { c.bench = { t0: performance.now(), frames: [], infer: [], poseFps: [], done: false }; l.toast('جاري القياس 20 ثانية… العب بشكل طبيعي'); };
    ui.querySelector('#bCopy').onclick = async () => {
      const txt = ui.querySelector('#report').value;
      try { await navigator.clipboard.writeText(txt); l.toast('تم نسخ التقرير'); } catch { ui.querySelector('#report').select(); l.toast('حدّد النص وانسخه يدوياً'); }
    };
    c.syncPerfUI = () => { sync(); prIn.value = R.getPixelRatio(); shIn.checked = R.shadowMap.enabled; };
    sync();
  },
  update(l, dt, g, current) {
    const c = l.ctx, P = c.perf, T = c.tracker; if (!current || !P) return;
    const now = performance.now(), ft = now - P.last; P.last = now;
    P.frames.push(ft); if (P.frames.length > 120) P.frames.shift();
    if (T.lastInferMs != null && T.lastInferMs !== P.lastInf) { P.infer.push(T.lastInferMs); P.lastInf = T.lastInferMs; if (P.infer.length > 60) P.infer.shift(); }
    // adaptive quality: sustained slow frames → lower pixel ratio, then shadows
    if (c.autoQ) {
      P.slowT = pct(P.frames, 0.5) > 40 ? (P.slowT || 0) + dt : 0;
      if (P.slowT > 2) {
        const R = c.view.renderer; P.slowT = 0;
        if (R.getPixelRatio() > 1) { R.setPixelRatio(Math.max(1, R.getPixelRatio() - 0.25)); c.view.resize(); l.toast('خُفّضت دقة الرسم تلقائياً'); }
        else if (R.shadowMap.enabled) { R.shadowMap.enabled = false; c.view.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); l.toast('أُطفئت الظلال تلقائياً'); }
        c.syncPerfUI?.();
      }
    }
    const B = c.bench;
    if (B && !B.done) {
      B.frames.push(ft); if (T.lastInferMs != null) B.infer.push(T.lastInferMs); B.poseFps.push(T.fps);
      const el = (now - B.t0) / 1000;
      l.metric('الاختبار', `${el.toFixed(0)} / 20 ث`);
      if (el >= 20) {
        const R = c.view.renderer;
        B.r = {
          fpsP50: +(1000 / pct(B.frames, 0.5)).toFixed(1), frameP50: +pct(B.frames, 0.5).toFixed(1), frameP95: +pct(B.frames, 0.95).toFixed(1),
          longFrames: B.frames.filter((x) => x > 100).length, poseFps: +(B.poseFps.reduce((a, b) => a + b, 0) / B.poseFps.length).toFixed(1),
          inferP50: +pct(B.infer, 0.5).toFixed(1), inferP95: +pct(B.infer, 0.95).toFixed(1), renderMs: +c.view.frameMs.toFixed(2), simMs: +(c.s5?.simMs || 0).toFixed(2),
          cameraFps: +(l.camera?.fps || 0).toFixed(1), pixelRatio: R.getPixelRatio(), shadows: R.shadowMap.enabled, occlusion: !!c.occluder?.enabled,
          stage5Running: !!(c.game && c.game.state !== 'idle'),
        };
        B.done = true;
        const rep = { when: new Date().toISOString(), device: deviceInfo(l), result: B.r, calib: c.floor?.result && { Z: +c.floor.result.Z.toFixed(2), camH: +(-c.floor.result.floorY).toFixed(2), pitchSrc: c.floor.pitchSource } };
        const ta = document.querySelector('#report'); ta.hidden = false; ta.value = JSON.stringify(rep, null, 1);
        document.querySelector('#bCopy').disabled = false;
        l.toast('انتهى الاختبار');
      }
    }
    const R = c.view.renderer;
    l.metric('الإطارات الآن', `${(1000 / pct(P.frames, 0.5)).toFixed(0)} fps (p95 ${pct(P.frames, 0.95).toFixed(0)} ms)`);
    l.metric('تتبع الجسم', `${T.fps.toFixed(0)} fps • ${pct(P.infer, 0.5).toFixed(0)} ms • ${T.delegate}`);
    l.metric('الرسم', `${c.view.frameMs.toFixed(1)} ms • دقة ${R.getPixelRatio()} • ظلال ${R.shadowMap.enabled ? 'نعم' : 'لا'}`);
    l.metric('الحجب', c.occluder?.enabled ? 'يعمل' : 'متوقف');
    l.metric('الكاميرا', `${(l.camera?.fps || 0).toFixed(0)} fps`);
    if (B?.done) l.metric('النتيجة', `${B.r.fpsP50} fps • p95 ${B.r.frameP95} ms • تتبع ${B.r.inferP50} ms`);
  },
});
