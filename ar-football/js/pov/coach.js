// The coach: tracks how you do against the defenders, moves the difficulty LEVEL (1–10) to keep you
// near ~60 % success, explains your losses, and remembers your progress on this device.
const KEY = 'pov.coach.v1';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Coach {
  constructor() {
    let s = {}; try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { s = {}; }
    this.level = clamp(Number(s.level) || 2, 1, 10);
    this.history = Array.isArray(s.history) ? s.history.slice(-30) : [];
    this.bestStreak = s.bestStreak || 0; this.rounds = s.rounds || 0;
    this.startLevel = this.level;
    this.newSession();
  }

  newSession() {
    this.ev = []; this.streak = 0; this.maxStreak = 0; this.t0 = performance.now(); this.recent = [];
    this.startLevel = this.level;
  }

  // e: {type:'beaten'|'won'|'foul', how, exposed, ballDist, cuts, speed, ttb}
  record(e) {
    this.ev.push({ ...e, at: performance.now() });
    if (e.type === 'beaten' || e.type === 'foul') {
      this.streak++; this.maxStreak = Math.max(this.maxStreak, this.streak);
      this.level = clamp(this.level + 0.24 * (1 - this.level / 11), 1, 10);
    } else if (e.type === 'won') {
      this.streak = 0;
      this.level = clamp(this.level - 0.17, 1, 10);
    }
    if (e.type !== 'miss') { this.recent.push(e.type === 'won' ? 0 : 1); if (this.recent.length > 10) this.recent.shift(); }
    return this.level;
  }

  // Short hint right after a lost ball.
  hintFor(e) {
    if (e.how === 'block') return 'كرتك راحت مباشرة في المدافع. غيّر اتجاهها قبل ما تقرب.';
    if (e.exposed) return 'كرتك كانت بعيدة عنك لحظة التدخل. قرّبها من رجلك.';
    if ((e.cuts ?? 0) < 1) return 'خطّك كان مستقيماً والمدافع قرأه. أضف تغيير اتجاه.';
    return 'حاول تبعد الكرة عن رجله بتغيير سرعة قبل التمويه.';
  }

  summary() {
    const won = this.ev.filter((x) => x.type === 'won'), beat = this.ev.filter((x) => x.type === 'beaten' || x.type === 'foul');
    const n = won.length + beat.length, rate = n ? beat.length / n : null;
    const blocks = won.filter((x) => x.how === 'block').length, exposed = won.filter((x) => x.exposed && x.how !== 'block').length;
    const straight = won.filter((x) => (x.cuts ?? 0) < 1).length;
    const ttb = beat.map((x) => x.ttb).filter((x) => x > 0), avgTtb = ttb.length ? ttb.reduce((a, b) => a + b, 0) / ttb.length : null;
    const tips = [];
    if (n < 3) tips.push('جولة قصيرة: العب 3 مواجهات على الأقل حتى أقيّمك بدقة.');
    else {
      if (won.length && blocks / won.length >= 0.4) tips.push(`${blocks} من ${won.length} خسارات كانت كرة دخلت في المدافع. غيّر اتجاه الكرة قبل ما تصير على بعد متر ونص منه.`);
      if (won.length && exposed / won.length >= 0.35) tips.push('كثير من خسائرك كانت لمسة ثقيلة: الكرة بعيدة عنك لما انقضّ. حاول تبقيها قريبة بلمسات أقصر.');
      if (won.length && straight / won.length >= 0.5) tips.push('أغلب خسائرك كانت وأنت تجري مستقيماً. المدافع يقرأ الخط المستقيم، فبدّل الاتجاه وغيّر الإيقاع.');
      if (rate !== null && rate >= 0.75) tips.push('أداء قوي. رفعنا الصعوبة لك.');
      else if (rate !== null && rate < 0.3) tips.push('خفضنا الصعوبة قليلاً حتى تبني الإيقاع. ركّز على تمويهة واحدة وكررها.');
      if (avgTtb && avgTtb < 2.2) tips.push(`تتجاوز المدافع في ${avgTtb.toFixed(1)} ثانية في المتوسط. سريع.`);
    }
    return { n, beaten: beat.length, lost: won.length, rate, maxStreak: this.maxStreak, avgTtb, tips, levelFrom: this.startLevel, levelTo: this.level, secs: (performance.now() - this.t0) / 1000 };
  }

  endSession() {
    const s = this.summary();
    if (s.n >= 1) { this.history.push({ t: Date.now(), level: +this.level.toFixed(2), rate: s.rate, n: s.n, streak: s.maxStreak }); this.rounds++; }
    this.bestStreak = Math.max(this.bestStreak, this.maxStreak);
    this.save(); return s;
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify({ level: this.level, history: this.history.slice(-30), bestStreak: this.bestStreak, rounds: this.rounds })); } catch { /* storage unavailable */ }
  }

  // small inline SVG of your level over the last sessions
  sparkline(w = 220, h = 50) {
    const pts = this.history.slice(-12).map((x) => x.level); if (pts.length < 2) return '';
    const lo = Math.min(...pts, 1), hi = Math.max(...pts, 4), X = (i) => (i / (pts.length - 1)) * (w - 8) + 4, Y = (v) => h - 6 - ((v - lo) / (hi - lo)) * (h - 12);
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="تطور مستواك"><polyline fill="none" stroke="#4fd88a" stroke-width="2.5" points="${pts.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}"/>${pts.map((v, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3" fill="#4fd88a"/>`).join('')}</svg>`;
  }
}
