import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* -------------------------------------------------------
   Smooth scroll (Lenis) wired into GSAP's ticker
------------------------------------------------------- */
let lenis;
if (!prefersReducedMotion) {
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* -------------------------------------------------------
   Loaded state → triggers hero line reveal
------------------------------------------------------- */
requestAnimationFrame(() => document.body.classList.add('is-loaded'));

/* -------------------------------------------------------
   Custom cursor
------------------------------------------------------- */
const cursor = document.querySelector('.cursor');
if (cursor && window.matchMedia('(hover: hover)').matches) {
  const dot = cursor.querySelector('.cursor__dot');
  const ring = cursor.querySelector('.cursor__ring');
  let mx = 0, my = 0, rx = 0, ry = 0;

  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  });

  const tick = () => {
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(tick);
  };
  tick();

  document.querySelectorAll('[data-hover]').forEach((el) => {
    el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
  });
}

/* -------------------------------------------------------
   Scroll progress rail
------------------------------------------------------- */
const fill = document.getElementById('scrollFill');
function updateProgress() {
  const h = document.documentElement;
  const scrolled = h.scrollTop;
  const max = h.scrollHeight - h.clientHeight;
  fill.style.width = `${max > 0 ? (scrolled / max) * 100 : 0}%`;
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

/* -------------------------------------------------------
   Menu overlay toggle
------------------------------------------------------- */
const menuToggle = document.getElementById('menuToggle');
const menuOverlay = document.getElementById('menuOverlay');
menuToggle?.addEventListener('click', () => {
  const open = menuOverlay.classList.toggle('is-open');
  menuToggle.classList.toggle('is-open', open);
  document.body.style.overflow = open ? 'hidden' : '';
});
menuOverlay?.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => {
    menuOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
  })
);

/* -------------------------------------------------------
   Generic reveal-on-scroll for [data-reveal]
------------------------------------------------------- */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
);
document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));

/* -------------------------------------------------------
   Divider draw-in
------------------------------------------------------- */
document.querySelectorAll('[data-draw]').forEach((el) => {
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-drawn');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  obs.observe(el);
});

/* -------------------------------------------------------
   Count-up stats
------------------------------------------------------- */
document.querySelectorAll('[data-count]').forEach((el) => {
  const target = parseFloat(el.dataset.count);
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);
        const counter = { val: 0 };
        gsap.to(counter, {
          val: target,
          duration: 1.8,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = `${prefix}${Math.floor(counter.val)}${suffix}`;
          },
        });
      });
    },
    { threshold: 0.4 }
  );
  obs.observe(el);
});

/* -------------------------------------------------------
   Hero parallax photo + orb drift on scroll
------------------------------------------------------- */
const heroPhoto = document.querySelector('[data-parallax]');
if (heroPhoto && !prefersReducedMotion) {
  gsap.to(heroPhoto, {
    yPercent: 18,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
}

/* -------------------------------------------------------
   Feature showcase — hover/click swaps sticky visual
------------------------------------------------------- */
const featureItems = document.querySelectorAll('[data-feature]');
const visualPanels = document.querySelectorAll('[data-fv]');

function activateFeature(el) {
  featureItems.forEach((f) => f.classList.remove('is-active'));
  el.classList.add('is-active');
  const key = el.dataset.visual;
  visualPanels.forEach((v) => v.classList.toggle('is-active', v.dataset.fv === key));
}

featureItems.forEach((el) => {
  el.addEventListener('mouseenter', () => activateFeature(el));
  el.addEventListener('click', () => activateFeature(el));
  el.addEventListener('focus', () => activateFeature(el));
});
if (featureItems[0]) activateFeature(featureItems[0]);

/* -------------------------------------------------------
   Process — pinned horizontal scroll
------------------------------------------------------- */
const processTrack = document.getElementById('processTrack');
if (processTrack && !prefersReducedMotion) {
  const setPin = () => {
    ScrollTrigger.getById('processPin')?.kill();
    const distance = processTrack.scrollWidth - window.innerWidth;
    if (distance <= 0) return;
    gsap.to(processTrack, {
      x: -distance,
      ease: 'none',
      scrollTrigger: {
        id: 'processPin',
        trigger: '.process__pin',
        start: 'top top',
        end: () => `+=${distance}`,
        scrub: 0.6,
        pin: true,
        invalidateOnRefresh: true,
      },
    });
  };
  setPin();
  window.addEventListener('resize', () => {
    clearTimeout(window.__pt);
    window.__pt = setTimeout(setPin, 200);
  });
}

/* -------------------------------------------------------
   Magnetic CTA button
------------------------------------------------------- */
document.querySelectorAll('[data-magnetic]').forEach((el) => {
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(el, { x: x * 0.35, y: y * 0.5, duration: 0.5, ease: 'power3.out' });
  });
  el.addEventListener('mouseleave', () => {
    gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
  });
});

/* -------------------------------------------------------
   Smooth in-page anchor scrolling
------------------------------------------------------- */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: -20 });
    else target.scrollIntoView({ behavior: 'smooth' });
  });
});

ScrollTrigger.refresh();
