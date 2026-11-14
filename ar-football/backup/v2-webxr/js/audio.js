// Synthesised sound effects (Web Audio) — no audio files to download.
export class Sfx {
  constructor() { this.ctx = null; this.enabled = true; this.crowd = null; }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(this.ctx.destination);
      this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setEnabled(on) { this.enabled = on; if (this.master) this.master.gain.value = on ? 0.8 : 0; }

  _noise(dur, { freq = 800, q = 1, type = 'bandpass', gain = 0.5, attack = 0.005, decay } = {}) {
    if (!this.ctx || !this.enabled) return;
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.001, t + (decay ?? dur));
    src.connect(f).connect(g).connect(this.master); src.start(t, Math.random()); src.stop(t + dur + 0.05);
    return { f, g, t };
  }
  _tone(freq, dur, { type = 'sine', gain = 0.3, slide = 0 } = {}) {
    if (!this.ctx || !this.enabled) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }

  touch() { this._tone(140, 0.09, { gain: 0.35, slide: -60 }); this._noise(0.05, { freq: 1800, gain: 0.08 }); }
  kick() { this._tone(110, 0.16, { gain: 0.6, slide: -70 }); this._noise(0.08, { freq: 2500, gain: 0.25 }); }
  whoosh() {
    const n = this._noise(0.35, { freq: 400, q: 2, gain: 0.25, attack: 0.08 });
    if (n) n.f.frequency.exponentialRampToValueAtTime(2400, n.t + 0.3);
  }
  tackle() { this._noise(0.25, { freq: 300, q: 0.7, gain: 0.6, type: 'lowpass' }); this._tone(70, 0.2, { gain: 0.5, slide: -30 }); }
  whistle(long = false) {
    if (!this.ctx || !this.enabled) return;
    const c = this.ctx, t = c.currentTime, dur = long ? 0.9 : 0.35;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 2900;
    const lfo = c.createOscillator(); lfo.frequency.value = 28; const lg = c.createGain(); lg.gain.value = 120; lfo.connect(lg).connect(o.frequency);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.02); g.gain.setValueAtTime(0.18, t + dur - 0.05); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(this.master); o.start(t); lfo.start(t); o.stop(t + dur); lfo.stop(t + dur);
  }
  cheer(big = false) { this._noise(big ? 2.8 : 1.2, { freq: 1100, q: 0.5, gain: big ? 0.55 : 0.25, attack: 0.15 }); }
  groan() { this._noise(1.0, { freq: 380, q: 0.8, gain: 0.3, attack: 0.1 }); }
  beep(hi = false) { this._tone(hi ? 880 : 520, 0.15, { type: 'square', gain: 0.12 }); }

  startCrowd() {
    if (!this.ctx || this.crowd) return;
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.4;
    const g = c.createGain(); g.gain.value = 0.045;
    src.connect(f).connect(g).connect(this.master); src.start();
    this.crowd = { src, g };
  }
  stopCrowd() { if (this.crowd) { this.crowd.src.stop(); this.crowd = null; } }
}
