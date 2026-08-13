/* ============================================================
   MASSIF — interactions
   vanilla, no dependencies. every effect degrades to static.
   ============================================================ */
(() => {
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp  = (a, b, t) => a + (b - a) * t;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE    = matchMedia('(hover: hover) and (pointer: fine)').matches;
const RTL     = document.documentElement.dir === 'rtl';

/* ── preloader ─────────────────────────────────────────── */
function preload(done){
  const el = $('#preloader'), count = $('#preCount'), bar = $('#preBar');
  if (!el) return done();
  if (REDUCED){ el.classList.add('is-done'); return done(); }

  let v = 0, t0 = performance.now();
  const DUR = 1150;
  (function tick(now){
    const p = clamp((now - t0) / DUR, 0, 1);
    v = Math.round((1 - Math.pow(1 - p, 3)) * 100);
    count.textContent = String(v).padStart(2, '0');
    bar.style.width = v + '%';
    if (p < 1) requestAnimationFrame(tick);
    else setTimeout(() => { el.classList.add('is-done'); done(); }, 240);
  })(t0);
}

/* ── scroll reveals ────────────────────────────────────── */
function reveals(){
  const targets = $$('.reveal-up, .reveal-lines, .hero__title, .cta__title, .quote p');

  targets.forEach(el => {
    const masks = $$('.mask', el);
    masks.forEach((m, i) => m.style.setProperty('--d', (i * 105) + 'ms'));
    if (el.classList.contains('reveal-up')){
      const sibs = [...el.parentElement.children].filter(n => n.classList.contains('reveal-up'));
      const i = sibs.indexOf(el);
      if (i > 0) el.style.setProperty('--d', (i * 85) + 'ms');
    }
  });

  if (!('IntersectionObserver' in window)){
    targets.forEach(el => el.classList.add('is-in')); return;
  }
  const io = new IntersectionObserver((ents) => {
    ents.forEach(e => { if (e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
  targets.forEach(el => io.observe(el));
}

/* ── nav ───────────────────────────────────────────────── */
function nav(){
  const el = $('#nav'); let last = 0;
  const on = () => {
    const y = scrollY;
    el.classList.toggle('is-stuck', y > 40);
    el.classList.toggle('is-hidden', y > 480 && y > last + 4);
    last = y;
  };
  addEventListener('scroll', on, { passive: true }); on();
}

/* ── overlay menu ──────────────────────────────────────── */
function menu(){
  const btn = $('#burger'), panel = $('#menu'); if (!btn || !panel) return;
  const set = open => {
    document.body.classList.toggle('is-menu', open);
    btn.setAttribute('aria-expanded', String(open));
    const txt = btn.querySelector('.burger__txt');
    txt.textContent = open ? (btn.dataset.open || 'Close') : (btn.dataset.closed || 'Menu');
    open ? panel.removeAttribute('inert') : panel.setAttribute('inert', '');
  };
  btn.addEventListener('click', () => set(!document.body.classList.contains('is-menu')));
  $$('a', panel).forEach(a => a.addEventListener('click', () => set(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
}

/* ── cursor + magnetic ─────────────────────────────────── */
function cursor(){
  if (!FINE) return;
  const el = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring');
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;

  addEventListener('pointermove', e => {
    x = e.clientX; y = e.clientY; el.classList.add('is-on');
    const hit = e.target.closest('a,button,[data-cursor]');
    const mode = hit ? (hit.dataset.cursor || 'link') : '';
    el.classList.toggle('is-link', mode === 'link');
    el.classList.toggle('is-hidden', mode === 'hidden');
  }, { passive: true });
  addEventListener('pointerdown', () => el.classList.add('is-link'));
  addEventListener('blur', () => el.classList.remove('is-on'));

  (function loop(){
    rx = lerp(rx, x, .16); ry = lerp(ry, y, .16);
    dot.style.transform  = `translate(${x}px,${y}px) translate(-50%,-50%)`;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();

  $$('[data-magnetic]').forEach(btn => {
    let mx = 0, my = 0, cx = 0, cy = 0, raf = null;
    const run = () => {
      cx = lerp(cx, mx, .18); cy = lerp(cy, my, .18);
      btn.style.transform = `translate(${cx}px,${cy}px)`;
      if (Math.abs(cx - mx) > .1 || Math.abs(cy - my) > .1) raf = requestAnimationFrame(run);
      else raf = null;
    };
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      mx = (e.clientX - r.left - r.width / 2) * .32;
      my = (e.clientY - r.top - r.height / 2) * .42;
      if (!raf) raf = requestAnimationFrame(run);
    });
    btn.addEventListener('pointerleave', () => { mx = my = 0; if (!raf) raf = requestAnimationFrame(run); });
  });
}

/* ── hero parallax ─────────────────────────────────────── */
function heroParallax(){
  if (REDUCED) return;
  const wrap = $('.hero__imgwrap'), hero = $('.hero'); if (!wrap) return;
  let target = 0, cur = 0, ticking = false;
  const read = () => {
    const h = hero.offsetHeight;
    target = clamp(scrollY / h, 0, 1); ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking){ ticking = true; requestAnimationFrame(read); } }, { passive: true });
  (function loop(){
    cur = lerp(cur, target, .09);
    wrap.style.transform = `translate3d(0,${cur * 16}vh,0) scale(${1 + cur * .1})`;
    wrap.style.filter = `blur(${cur * 5}px)`;
    requestAnimationFrame(loop);
  })();
}

/* ── comparator ────────────────────────────────────────── */
function comparator(){
  const frame = $('#compare .compare__frame'), handle = $('#compareHandle');
  if (!frame) return;
  let x = 52, drag = false;

  const set = v => {
    x = clamp(v, 4, 96);
    frame.style.setProperty('--x', x + '%');
    handle.setAttribute('aria-valuenow', Math.round(x));
  };
  const fromEvent = e => {
    const r = frame.getBoundingClientRect();
    set(((e.clientX - r.left) / r.width) * 100);
  };
  frame.addEventListener('pointerdown', e => { drag = true; frame.setPointerCapture(e.pointerId); fromEvent(e); });
  frame.addEventListener('pointermove', e => { if (drag) fromEvent(e); else if (FINE && e.pointerType === 'mouse') fromEvent(e); });
  frame.addEventListener('pointerup',   () => drag = false);
  frame.addEventListener('pointercancel', () => drag = false);
  handle.addEventListener('keydown', e => {
    const step = e.shiftKey ? 10 : 3;
    if (e.key === 'ArrowLeft'){ set(x - step); e.preventDefault(); }
    if (e.key === 'ArrowRight'){ set(x + step); e.preventDefault(); }
  });
  set(52);
}

/* ── capability hover peek ─────────────────────────────── */
function capsPeek(){
  const list = $('#capsList'), peek = $('#capsPeek'); if (!list || !peek || !FINE) return;
  const img = $('img', peek);
  let x = 0, y = 0, cx = 0, cy = 0, on = false;

  $$('.cap', list).forEach(cap => {
    const src = cap.dataset.img;
    const pre = new Image(); pre.src = src;                       // warm the cache
    cap.addEventListener('pointerenter', () => {
      img.src = src; on = true; peek.classList.add('is-on');
    });
  });
  list.addEventListener('pointerleave', () => { on = false; peek.classList.remove('is-on'); });
  list.addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; }, { passive: true });

  (function loop(){
    cx = lerp(cx, x, .1); cy = lerp(cy, y, .1);
    if (on){
      const w = peek.offsetWidth || 260;
      peek.style.top  = cy + 'px';
      peek.style.left = RTL ? Math.max(cx - w * .72, w * .58) + 'px'
                            : Math.min(cx + w * .72, innerWidth - w * .58) + 'px';
    }
    requestAnimationFrame(loop);
  })();
}

/* ── counters ──────────────────────────────────────────── */
function counters(){
  const nums = $$('.stat__num'); if (!nums.length) return;
  const run = el => {
    const to = +el.dataset.count, sfx = el.dataset.suffix || '';
    if (to === 0 || REDUCED){ el.textContent = (to === 0 ? (el.dataset.zero || '0') : to) + sfx; return; }
    const t0 = performance.now(), DUR = 1700;
    (function tick(now){
      const p = clamp((now - t0) / DUR, 0, 1);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(to * e) + sfx;
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  };
  const io = new IntersectionObserver((ents) => {
    ents.forEach(e => { if (e.isIntersecting){ run(e.target); io.unobserve(e.target); } });
  }, { threshold: .5 });
  nums.forEach(n => io.observe(n));
}

/* ── method · structural model ─────────────────────────── */
function methodModel(){
  const cv = $('#frameCanvas'); if (!cv) return;
  const ctx = cv.getContext('2d');
  const hudL = $('#hudLabel'), hudP = $('#hudPct');
  const stages = $$('.stage');
  const NAMES = stages.map(s => ($('.stage__t', s) || {}).textContent || '');

  /* ── geometry ──────────────────────────────────────────
     a two-volume house: a grounded plinth and a cantilevered
     upper mass under a floating roof slab.                */
  const W = 8, D = 5, H1 = 3.4, H2 = 6.6;
  const LOW  = { x0: 0,    x1: W,     y0: 0,  y1: D,      z0: 0,  z1: H1 };
  const UPP  = { x0: -1.5, x1: W - .8, y0: .7, y1: D - .5, z0: H1, z1: H2 };
  const ROOF = { x0: -2,   x1: W - .3, y0: .2, y1: D,      z0: H2, z1: H2 + .32 };

  const S = [[], [], [], []];                    // line segments per stage
  const F = [[], [], [], []];                    // translucent faces per stage
  const seg  = (s, a, b) => S[s].push([a, b]);
  const face = (s, pts, a) => F[s].push({ pts, a });
  const ring = (s, z, b) => {
    seg(s, [b.x0, b.y0, z], [b.x1, b.y0, z]); seg(s, [b.x1, b.y0, z], [b.x1, b.y1, z]);
    seg(s, [b.x1, b.y1, z], [b.x0, b.y1, z]); seg(s, [b.x0, b.y1, z], [b.x0, b.y0, z]);
  };
  const box = (s, b, aTop, aSide) => {
    ring(s, b.z0, b); ring(s, b.z1, b);
    [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]]
      .forEach(([x, y]) => seg(s, [x, y, b.z0], [x, y, b.z1]));
    const C = [
      [[b.x0,b.y0,b.z1],[b.x1,b.y0,b.z1],[b.x1,b.y1,b.z1],[b.x0,b.y1,b.z1]],   // top
      [[b.x0,b.y0,b.z0],[b.x1,b.y0,b.z0],[b.x1,b.y0,b.z1],[b.x0,b.y0,b.z1]],   // front
      [[b.x0,b.y1,b.z0],[b.x1,b.y1,b.z0],[b.x1,b.y1,b.z1],[b.x0,b.y1,b.z1]],   // back
      [[b.x0,b.y0,b.z0],[b.x0,b.y1,b.z0],[b.x0,b.y1,b.z1],[b.x0,b.y0,b.z1]],   // left
      [[b.x1,b.y0,b.z0],[b.x1,b.y1,b.z0],[b.x1,b.y1,b.z1],[b.x1,b.y0,b.z1]],   // right
    ];
    C.forEach((pts, i) => face(s, pts, i === 0 ? aTop : aSide));
  };

  // 00 · survey — ground grid, boundary, footprint
  const G = { x0: -2.4, x1: W + 2, y0: -1.6, y1: D + 1.6 };
  for (let x = G.x0; x <= G.x1 + .01; x += 1.6) seg(0, [x, G.y0, 0], [x, G.y1, 0]);
  for (let y = G.y0; y <= G.y1 + .01; y += 1.6) seg(0, [G.x0, y, 0], [G.x1, y, 0]);
  ring(0, 0, G); ring(0, .001, LOW);

  // 01 · frame — footings, columns, floor beams
  const COLS = [[0,0],[W/2,0],[W,0],[0,D],[W/2,D],[W,D]];
  COLS.forEach(([x, y]) => {
    ring(1, 0, { x0:x-.32, x1:x+.32, y0:y-.32, y1:y+.32 });
    seg(1, [x, y, 0], [x, y, H2]);
  });
  [H1, H2].forEach(z => { ring(1, z, LOW); seg(1, [W/2, 0, z], [W/2, D, z]); });
  seg(1, [0, D/2, H1], [W, D/2, H1]);

  // 02 · envelope — the two masses close up
  box(2, LOW, .055, .032);
  box(2, UPP, .05, .038);
  for (let x = 1.6; x < W; x += 1.6) seg(2, [x, 0, 0], [x, 0, H1]);          // front mullions
  for (let y = 1.6; y < D; y += 1.6) seg(2, [W, y, 0], [W, y, H1]);          // side mullions

  // 03 · delivery — roof slab, upper glazing, entry
  box(3, ROOF, .085, .05);
  for (let x = UPP.x0 + .7; x < UPP.x1; x += 1.5) seg(3, [x, UPP.y0, H1], [x, UPP.y0, H2]);
  seg(3, [2.4, -1.4, 0], [5.6, -1.4, 0]); seg(3, [2.4, -1.4, 0], [2.4, 0, 0]);
  seg(3, [5.6, -1.4, 0], [5.6, 0, 0]);
  [.35, .7, 1.05].forEach(d => seg(3, [2.4, -1.4 + d, d * .18], [5.6, -1.4 + d, d * .18]));

  /* ── projection ────────────────────────────────────── */
  let yaw = 0, mx = 0, my = 0, t = 0;
  let prog = 0, target = 1, active = 0;
  let k = 10, ox = 0, oy = 0;

  const cvw = () => cv.getBoundingClientRect();

  /* world → unscaled iso plane; third value is camera depth (high = near) */
  function iso(p, y, tilt){
    const dx = p[0] - W / 2, dy = p[1] - D / 2;
    const c = Math.cos(y), s = Math.sin(y);
    const X = dx * c - dy * s, Y = dx * s + dy * c;
    return [(X - Y) * .866, (X + Y) * .5 - p[2] * tilt, X + Y];
  }

  /* solve scale + centring across the yaw sweep so nothing ever crops */
  function solve(r){
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let i = 0; i <= 6; i++){
      const y = -.16 + (i / 6) * .52;
      for (const list of S) for (const sg of list) for (const p of sg){
        const [u, v] = iso(p, y, 1.0);
        if (u < x0) x0 = u; if (u > x1) x1 = u;
        if (v < y0) y0 = v; if (v > y1) y1 = v;
      }
    }
    k = Math.min(r.width * .86 / (x1 - x0), r.height * .86 / (y1 - y0));
    ox = r.width / 2 - ((x0 + x1) / 2) * k;
    oy = r.height / 2 - ((y0 + y1) / 2) * k;
  }

  function fit(){
    const r = cvw(); if (!r.width) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    solve(r);
  }
  new ResizeObserver(fit).observe(cv);
  fit();

  const project = p => {
    const [u, v, d] = iso(p, yaw, .95 + my * .09);
    return [ox + u * k, oy + v * k, d];
  };

  /* ── render ────────────────────────────────────────── */
  function draw(){
    const r = cvw();
    ctx.clearRect(0, 0, r.width, r.height);

    const g = ctx.createLinearGradient(0, 0, 0, r.height);
    g.addColorStop(0, 'rgba(236,231,221,.035)'); g.addColorStop(1, 'rgba(236,231,221,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, r.width, r.height);

    /* faces — far to near, so the masses read as glass */
    const faces = [];
    for (let s = 0; s < 4; s++){
      const done = clamp(prog - s, 0, 1);
      if (done <= .05) continue;
      F[s].forEach(f => {
        const pts = f.pts.map(project);
        faces.push({ pts, a: f.a * done, d: pts.reduce((n, p) => n + p[2], 0) / pts.length });
      });
    }
    faces.sort((a, b) => a.d - b.d);
    faces.forEach(f => {
      ctx.beginPath();
      f.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
      ctx.closePath();
      ctx.fillStyle = `rgba(236,231,221,${f.a.toFixed(4)})`;
      ctx.fill();
    });

    /* lines — drawn on, segment by segment */
    ctx.lineCap = 'round';
    for (let s = 0; s < 4; s++){
      const list = S[s], n = list.length;
      for (let i = 0; i < n; i++){
        const f = clamp((prog - s) * (n * .6) - i * .6, 0, 1);
        if (f <= 0) continue;
        const A = project(list[i][0]), B = project(list[i][1]);
        const E = [lerp(A[0], B[0], f), lerp(A[1], B[1], f)];
        const drawing = f < 1;
        const depth = clamp(((A[2] + B[2]) / 2 + 8) / 16, 0, 1);   // near = bright
        const near = .46 + depth * .54;
        const base = s === 0 ? .2 : s === active ? .82 : .54;
        ctx.strokeStyle = drawing ? 'rgba(230,198,141,.95)'
                                  : `rgba(236,231,221,${(base * near).toFixed(3)})`;
        ctx.lineWidth = drawing ? 1.5 : (s === 0 ? .55 : (s === active ? 1.05 : .8) * (.7 + depth * .55));
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(E[0], E[1]); ctx.stroke();
        if (drawing){
          ctx.fillStyle = 'rgba(230,198,141,1)';
          ctx.beginPath(); ctx.arc(E[0], E[1], 1.6, 0, 6.284); ctx.fill();
        }
      }
    }
  }

  /* ── state ─────────────────────────────────────────── */
  let auto = true, seen = false, timer = null;

  function setStage(i, user){
    active = clamp(i, 0, 3); target = active + 1;
    stages.forEach((s, k) => s.classList.toggle('is-active', k === active));
    hudL.textContent = NAMES[active];
    if (user) auto = false;
  }
  stages.forEach((s, i) => $('button', s).addEventListener('click', () => setStage(i, true)));

  if (FINE){
    const host = cv.parentElement;
    host.addEventListener('pointermove', e => {
      const r = cvw();
      mx = ((e.clientX - r.left) / r.width - .5) * 2;
      my = ((e.clientY - r.top) / r.height - .5) * 2;
    }, { passive: true });
    host.addEventListener('pointerleave', () => { mx = 0; my = 0; });
  }

  /* advance on its own while on screen — until the visitor takes over */
  new IntersectionObserver(ents => {
    ents.forEach(e => {
      seen = e.isIntersecting;
      if (seen && auto && !timer) timer = setInterval(() => {
        if (auto && seen) setStage((active + 1) % 4, false);
      }, 4600);
    });
  }, { threshold: .3 }).observe(cv.parentElement);

  (function loop(){
    t += .016;
    yaw = lerp(yaw, .14 + Math.sin(t * .2) * .09 + mx * .22, .05);
    prog = lerp(prog, target, REDUCED ? 1 : .045);
    hudP.textContent = Math.round(clamp(prog / 4, 0, 1) * 100) + '%';
    draw();
    requestAnimationFrame(loop);
  })();

  setStage(0, false);
}

/* ── cta glow ──────────────────────────────────────────── */
function ctaGlow(){
  const sec = $('#begin'), glow = $('#ctaGlow'); if (!sec || !glow || !FINE) return;
  sec.addEventListener('pointermove', e => {
    const r = sec.getBoundingClientRect();
    glow.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100) + '%');
    glow.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100) + '%');
  }, { passive: true });
}

/* ── boot ──────────────────────────────────────────────── */
function boot(){
  nav(); menu(); cursor(); heroParallax(); comparator(); capsPeek();
  counters(); methodModel(); ctaGlow();
  preload(() => { document.body.classList.add('is-ready'); reveals(); });
}
if (document.readyState !== 'loading') boot();
else addEventListener('DOMContentLoaded', boot);

})();
