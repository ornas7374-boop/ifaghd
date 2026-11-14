// One-finger drag, two-finger pinch (scale) and twist (rotate) on an element.
export function attachGestures(el, { onTap, onDrag, onPinch, onRotate }) {
  const pts = new Map();
  let start = null, moved = false;
  const two = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x) }; };
  let last2 = null;
  el.addEventListener('pointerdown', (e) => {
    try { el.setPointerCapture(e.pointerId); } catch { /* synthetic or lost pointer */ }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { start = { x: e.clientX, y: e.clientY, t: performance.now() }; moved = false; }
    if (pts.size === 2) last2 = two();
  });
  el.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 1) {
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) moved = true;
      if (moved) onDrag?.(dx, dy);
    } else if (pts.size === 2) {
      const now = two(); moved = true;
      if (last2.d > 0) onPinch?.(now.d / last2.d);
      let da = now.ang - last2.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
      onRotate?.(-da);
      last2 = now;
    }
  });
  const up = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size === 0 && !moved && start && performance.now() - start.t < 400) onTap?.(e.clientX, e.clientY);
    if (pts.size === 2) last2 = two();
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}
