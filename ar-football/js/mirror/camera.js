// Stage 1 — front camera. Handles iOS Safari quirks (playsinline, muted, gesture-started play)
// and measures the real delivered frame rate (requestVideoFrameCallback when available).
export class FrontCamera {
  constructor(video) {
    this.video = video;
    this.stream = null;
    this.frames = 0; this.fps = 0; this._t0 = 0; this._cbId = 0;
    this.info = {};
  }

  // Must be called from a user gesture (tap) on iOS.
  // facing: 'user' (front, shown mirrored) | 'environment' (back camera)
  async start({ width = 640, height = 480, facing = 'user' } = {}) {
    this.stop();
    if (!window.isSecureContext) throw Object.assign(new Error('INSECURE'), { name: 'InsecureContext' });
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('NO_MEDIA'), { name: 'NoMedia' });
    const v = this.video;
    v.setAttribute('playsinline', ''); v.setAttribute('autoplay', ''); v.muted = true; v.playsInline = true;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: facing }, width: { ideal: width }, height: { ideal: height }, frameRate: { ideal: 30, max: 30 } },
    });
    v.srcObject = this.stream;
    await v.play();
    if (v.readyState < 2) await new Promise((r) => v.addEventListener('loadeddata', r, { once: true }));
    const track = this.stream.getVideoTracks()[0];
    const s = track.getSettings?.() || {};
    this.info = {
      label: track.label, width: v.videoWidth, height: v.videoHeight,
      facingMode: s.facingMode || (facing === 'environment' ? 'environment?' : 'unknown'), requested: facing, requestedFps: s.frameRate || null,
    };
    this._countFrames();
    return this.info;
  }

  _countFrames() {
    const v = this.video;
    this._t0 = performance.now(); this.frames = 0;
    const tick = () => {
      this.frames++;
      const now = performance.now();
      if (now - this._t0 >= 1000) { this.fps = (this.frames * 1000) / (now - this._t0); this.frames = 0; this._t0 = now; }
      this._cbId = v.requestVideoFrameCallback ? v.requestVideoFrameCallback(tick) : 0;
    };
    if (v.requestVideoFrameCallback) this._cbId = v.requestVideoFrameCallback(tick);
    else {
      // Fallback: count currentTime changes per animation frame.
      let last = -1;
      const raf = () => { if (!this.stream) return; if (v.currentTime !== last) { last = v.currentTime; tick(); } requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  get running() { return !!this.stream && this.stream.getVideoTracks()[0]?.readyState === 'live'; }

  stop() {
    if (this._cbId && this.video?.cancelVideoFrameCallback) this.video.cancelVideoFrameCallback(this._cbId);
    this._cbId = 0;
    this.stream?.getTracks().forEach((t) => t.stop()); this.stream = null; if (this.video) this.video.srcObject = null;
  }

  // Front camera = mirror view; back camera = true view.
  get mirrored() {
    const f = this.info.facingMode || '';
    if (f.startsWith('environment')) return false;
    if (f === 'user') return true;
    return this.info.requested !== 'environment';
  }
}

export function cameraErrorMessage(e) {
  const n = e?.name;
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'لم يُسمح باستخدام الكاميرا. على iPhone: الإعدادات ← Safari ← الكاميرا ← اسمح.';
  if (n === 'InsecureContext') return 'الكاميرا تحتاج رابط https (أو localhost).';
  if (n === 'NoMedia') return 'هذا المتصفح لا يدعم الوصول للكاميرا.';
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'لم يتم العثور على الكاميرا المطلوبة (أمامية/خلفية).';
  if (n === 'NotReadableError') return 'الكاميرا مستخدمة من تطبيق آخر. أغلقه وحاول مجدداً.';
  return 'تعذّر تشغيل الكاميرا: ' + (e?.message || e);
}
