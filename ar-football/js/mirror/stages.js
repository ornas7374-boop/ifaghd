// The six lab stages. Each: title, hint, limits (honest notes), checks[{label,test}], enter/update/exit.
// test() returns true (pass), false (fail, shown as warning) or null (not yet known).

import * as THREE from 'three';
import { PoseTracker, BONES } from '../pose.js';
import { FloorEstimator, TiltSensor } from './floor.js';

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
