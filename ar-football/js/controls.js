// Fallback input (keyboard + touch) that produces the same intent as the body controller.
// Intent: { steer -1..1, run 0..1, depth -1..1, events: [{type:'touch'|'kick'|'feint'|'handsUp', ...}] }

export class FallbackControls {
  constructor(root) {
    this.keys = new Set();
    this.events = [];
    this.joy = { x: 0, y: 0, active: false };
    this.autoTouchT = 0;
    this.enabled = false;

    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      this.keys.add(k);
      if (!this.enabled) return;
      if (k === ' ' || k === 'enter') { this.events.push({ type: 'kick', power: 0.85 }); e.preventDefault(); }
      if (k === 'q') this.events.push({ type: 'feint', dir: -1 });
      if (k === 'e') this.events.push({ type: 'feint', dir: 1 });
      if (k === 'j') this.events.push({ type: 'touch', foot: 'L' });
      if (k === 'k') this.events.push({ type: 'touch', foot: 'R' });
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());

    // Touch joystick
    const joy = root.querySelector('#joy');
    const knob = joy?.querySelector('i');
    if (joy) {
      let id = null;
      const set = (e) => {
        const r = joy.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        let x = (e.clientX - cx) / (r.width / 2), y = (e.clientY - cy) / (r.height / 2);
        const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
        this.joy = { x, y, active: true };
        knob.style.transform = `translate(${x * 60}%, ${y * 60}%)`;
      };
      joy.addEventListener('pointerdown', (e) => { id = e.pointerId; joy.setPointerCapture(id); set(e); });
      joy.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e); });
      const end = (e) => { if (e.pointerId !== id) return; id = null; this.joy = { x: 0, y: 0, active: false }; knob.style.transform = ''; };
      joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
    }
    const bind = (sel, fn) => root.querySelector(sel)?.addEventListener('pointerdown', (e) => { e.preventDefault(); if (this.enabled) fn(); });
    bind('#btnKick', () => this.events.push({ type: 'kick', power: 0.85 }));
    bind('#btnFeintL', () => this.events.push({ type: 'feint', dir: -1 }));
    bind('#btnFeintR', () => this.events.push({ type: 'feint', dir: 1 }));
  }

  read(dt) {
    const k = this.keys;
    let steer = (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0);
    let fwd = (k.has('arrowup') || k.has('w') ? 1 : 0) - (k.has('arrowdown') || k.has('s') ? 1 : 0);
    if (this.joy.active) { steer = this.joy.x; fwd = -this.joy.y; }
    const sprint = k.has('shift') ? 1 : 0.8;
    const run = Math.max(0, fwd) * sprint;
    const depth = fwd < -0.3 ? -1 : (k.has('shift') && fwd > 0 ? 0.6 : 0);
    // Simulated footwork: while running, a touch every ~0.3 s (keyboard has no feet).
    if (run > 0.1 || Math.abs(steer) > 0.3) {
      this.autoTouchT -= dt;
      if (this.autoTouchT <= 0) { this.events.push({ type: 'touch', foot: 'A' }); this.autoTouchT = 0.32; }
    } else this.autoTouchT = 0;
    const events = this.events; this.events = [];
    return { steer: Math.max(-1, Math.min(1, steer)), run, depth, events };
  }
}
