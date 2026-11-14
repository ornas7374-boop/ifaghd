// The six lab stages. Each: title, hint, limits (honest notes), checks[{label,test}], enter/update/exit.
// test() returns true (pass), false (fail, shown as warning) or null (not yet known).

import * as THREE from 'three';
import { PoseTracker, BONES } from '../pose.js';
import { FloorEstimator, TiltSensor } from './floor.js';
import { MirrorView, makeLifeSizePlayer, idle } from './view.js';

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
  const side = c.side ?? (r.X < 0 ? 1 : -1);
  pl.position.set(r.X + side * c.gap, 0, -r.Z + c.depthOff);
  pl.rotation.y = Math.PI; // face the camera (you)
  c.view.aimLight(pl.position.x, pl.position.z);
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
      <div class="row"><button class="ghost sm" id="bSide">بدّل الجهة</button></div>`;
    const sync = () => { ui.querySelector('#gOut').textContent = `${c.gap.toFixed(2)} م`; ui.querySelector('#dOut').textContent = `${c.depthOff >= 0 ? 'أقرب للكاميرا' : 'أبعد'} ${Math.abs(c.depthOff).toFixed(2)} م`; ui.querySelector('#kOut').textContent = `${Math.round(c.sizeK * 100)}%`; };
    const gIn = ui.querySelector('#gIn'), dIn = ui.querySelector('#dIn'), kIn = ui.querySelector('#kIn');
    gIn.value = c.gap; dIn.value = c.depthOff; kIn.value = c.sizeK;
    gIn.oninput = () => { c.gap = +gIn.value; sync(); };
    dIn.oninput = () => { c.depthOff = +dIn.value; sync(); };
    kIn.oninput = () => { c.sizeK = +kIn.value; sync(); };
    ui.querySelector('#bSide').onclick = () => { const r = c.floor.result; c.side = -(c.side ?? (r?.X < 0 ? 1 : -1)); };
    sync();
  },
  exit(l) { /* keep the player for later stages */ },
  update(l, dt, g, current) {
    const c = l.ctx, F = c.floor, r = F.result;
    if (!c.view) return;
    c.view.fit(F, l.video);
    c.view.updateLight(l.video, dt);
    if (!r) { c.player.visible = false; c.view.render(); return; }
    c.view.setFloor(r.floorY);
    const pl = c.player;
    pl.visible = l.stage <= 2 || c.keepSidePlayer !== false;
    pl.scale.setScalar((F.userHeight * c.sizeK) / pl.userData.natH);
    if (l.stage === 2) { placePlayer(l); idle(pl, dt, 0); }
    c.view.render();
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
  },
});
