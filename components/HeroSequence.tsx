"use client";

import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import {
  FRAME_COUNT,
  SEQUENCE_SETS,
  SequenceLoader,
  type SequenceSet,
} from "@/lib/sequence";
import { withBasePath } from "@/lib/basePath";
import { piecewise } from "@/lib/ramp";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { HeroNarrative, StackedNarrative } from "@/components/HeroNarrative";

/** Scroll length of the pin, in viewport heights. */
const PIN_VH = 350;

/** Per-frame easing of the scrub. Low enough to feel heavy, high enough to track. */
const SCRUB_LERP = 0.16;

/** How far the frame may overscan the viewport horizontally before we letterbox
 *  instead. Letterboxing is invisible: the bars are the same #060606 as both the
 *  page and the plate. */
const MAX_OVERSCAN = { desktop: 1.16, mobile: 1.12 };

/** Where the car sits vertically. On phones it rides high so the narrative can
 *  stack underneath it rather than across it. */
const ANCHOR_Y = { desktop: 0.5, mobile: 0.36 };

export function HeroSequence() {
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) return <StaticHero />;
  return <ScrubbedHero />;
}

/* ------------------------------------------------------------------ *
 * Reduced motion: a single cinematic still, the narrative stacked out
 * beneath it, opacity fades only.
 * ------------------------------------------------------------------ */

function StaticHero() {
  return (
    <section id="the-car" className="relative bg-ink">
      <div className="relative flex min-h-[86svh] items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={withBasePath("/hero-static.jpg")}
          alt="A quad-turbocharged W16 hypercar in three-quarter profile, lit against a black studio void."
          className="w-full max-w-[1800px] select-none"
          draggable={false}
        />
      </div>
      <StackedNarrative />
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * The pinned canvas.
 * ------------------------------------------------------------------ */

function ScrubbedHero() {
  const pinRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: pinRef,
    offset: ["start start", "end end"],
  });

  return (
    <section id="the-car" className="relative bg-ink">
      <div ref={pinRef} style={{ height: `${PIN_VH}vh` }}>
        <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
          <SequenceCanvas progress={scrollYProgress} />
          <HeroNarrative progress={scrollYProgress} />
          <ScrollHint progress={scrollYProgress} />
        </div>
      </div>
    </section>
  );
}

function ScrollHint({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, (p) => piecewise(p, [0.02, 0.07], [1, 0]));

  return (
    <motion.div
      style={{ opacity }}
      className="pointer-events-none absolute inset-x-0 bottom-8 hidden flex-col items-center gap-3 md:flex"
    >
      <span className="label">Scroll</span>
      <span className="block h-10 w-px bg-linear-to-b from-accent/60 to-transparent" />
    </motion.div>
  );
}

function SequenceCanvas({ progress }: { progress: MotionValue<number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [set, setSet] = useState<SequenceSet | null>(null);

  // Pick the frame set once we know the viewport, and swap it if the user
  // rotates a tablet across the breakpoint.
  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px)");
    const apply = () => setSet(query.matches ? "mobile" : "desktop");
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!set) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    const { width: frameW, height: frameH } = SEQUENCE_SETS[set];
    const loader = new SequenceLoader(set);

    let raf = 0;
    let smoothed = progress.get();
    let lastDrawn = -1;
    let viewport = { width: 0, height: 0 };
    let needsDraw = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      viewport = { width, height };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      needsDraw = true;
    };

    const draw = (index: number) => {
      const image = loader.nearestLoaded(index);
      const { width: vw, height: vh } = viewport;
      if (!vw || !vh) return;

      context.fillStyle = "#060606";
      context.fillRect(0, 0, vw, vh);
      if (!image) return;

      const fitWidth = vw / frameW;
      const cover = Math.max(fitWidth, vh / frameH);
      const scale = Math.min(cover, fitWidth * MAX_OVERSCAN[set]);

      const drawW = frameW * scale;
      const drawH = frameH * scale;
      context.drawImage(
        image,
        (vw - drawW) / 2,
        vh * ANCHOR_Y[set] - drawH / 2,
        drawW,
        drawH,
      );
    };

    // One rAF loop owns every canvas write. Scroll position eases into the
    // frame index, so the sequence never snaps and reverses just as smoothly.
    const tick = () => {
      const target = progress.get();
      const delta = target - smoothed;
      smoothed = Math.abs(delta) < 0.0002 ? target : smoothed + delta * SCRUB_LERP;

      const index = Math.min(
        FRAME_COUNT - 1,
        Math.max(0, Math.round(smoothed * (FRAME_COUNT - 1))),
      );

      if (index !== lastDrawn || needsDraw) {
        draw(index);
        lastDrawn = index;
        needsDraw = false;
      }
      raf = requestAnimationFrame(tick);
    };

    // A frame arriving may improve on the approximation currently painted.
    loader.onFrame = () => {
      needsDraw = true;
    };

    resize();
    loader.start();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      loader.stop();
    };
  }, [set, progress]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="A quad-turbocharged W16 hypercar moving forward and turning into three-quarter profile, scrubbed by scroll."
      role="img"
      className="absolute inset-0 h-full w-full bg-ink"
    />
  );
}
