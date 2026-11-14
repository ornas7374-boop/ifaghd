// The six lab stages. Each: title, hint, limits (honest notes), checks[{label,test}], enter/update/exit.
// test() returns true (pass), false (fail, shown as warning) or null (not yet known).

export const STAGES = [];

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
