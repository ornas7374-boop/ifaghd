"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";

import { CALLOUTS, CHAPTERS, type Chapter } from "@/lib/content";
import { piecewise } from "@/lib/ramp";

/** Fraction of a chapter's window spent fading in and out. */
const FADE = 0.28;

const ALIGN_CLASS: Record<Chapter["align"], string> = {
  center: "items-center text-center",
  left: "md:items-start md:text-left items-center text-center",
  right: "md:items-end md:text-right items-center text-center",
};

/* The performance chapter sets its type down the right-hand side, so the
   callouts live in the black to the left of and beneath the car. */
const CALLOUT_CLASS: Record<(typeof CALLOUTS)[number]["position"], string> = {
  "top-left": "left-[6%] top-[22%]",
  "top-right": "right-[6%] top-[13%] items-end",
  "mid-left": "left-[6%] top-[78%]",
  "bottom-right": "left-[52%] top-[86%]",
  "bottom-left": "left-[29%] top-[82%]",
};

/** Out, in, hold, out — the one shape every chapter fades through. */
function useChapterMotion(progress: MotionValue<number>, [start, end]: [number, number]) {
  const span = end - start;
  // The opening chapter is already on screen at rest, and the closing one holds
  // to the end of the pin; each fades only where it meets its neighbour.
  const first = start <= 0;
  const last = end >= 1;

  const stops = [
    first ? -0.2 : start,
    first ? -0.1 : start + span * FADE,
    last ? 1.1 : end - span * FADE,
    last ? 1.2 : end,
  ];

  return {
    opacity: useTransform(progress, (p) => piecewise(p, stops, [0, 1, 1, 0])),
    y: useTransform(progress, (p) => piecewise(p, stops, [26, 0, 0, -22])),
  };
}

/** Directional scrim that keeps the narrative legible over the footage.
 *  A soft cinematic fall-off from the edge the text sits on — not a panel.
 *  Weighted for a bright sunset frame, on top of the flat veil the hero already
 *  lays over the canvas. */
const SCRIM_CLASS: Record<Chapter["align"], string> = {
  center:
    "bg-[radial-gradient(120%_78%_at_50%_54%,rgba(6,6,6,0.94)_0%,rgba(6,6,6,0.7)_38%,rgba(6,6,6,0)_74%)]",
  left: "bg-linear-to-r from-[rgba(6,6,6,0.97)] from-[2%] via-[rgba(6,6,6,0.82)] via-[28%] to-transparent to-[68%]",
  right:
    "bg-linear-to-l from-[rgba(6,6,6,0.97)] from-[2%] via-[rgba(6,6,6,0.82)] via-[28%] to-transparent to-[68%]",
};

export function HeroNarrative({ progress }: { progress: MotionValue<number> }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {CHAPTERS.map((chapter) => (
        <ChapterOverlay key={chapter.id} chapter={chapter} progress={progress} />
      ))}
      <Callouts progress={progress} />
    </div>
  );
}

function ChapterOverlay({
  chapter,
  progress,
}: {
  chapter: Chapter;
  progress: MotionValue<number>;
}) {
  const { opacity, y } = useChapterMotion(progress, chapter.range);
  const isHero = chapter.id === "hero";

  return (
    <motion.div style={{ opacity }} aria-hidden className="absolute inset-0">
      <div className={`absolute inset-0 ${SCRIM_CLASS[chapter.align]}`} />

      <motion.div
        style={{ y }}
        className={[
          "absolute inset-x-0 flex flex-col px-6 sm:px-10 md:px-[6vw]",
          // On phones the narrative sits below the car rather than across it.
          "bottom-[9svh] md:bottom-auto md:top-1/2 md:-translate-y-1/2",
          ALIGN_CLASS[chapter.align],
        ].join(" ")}
      >
      <div className={chapter.copy ? "md:max-w-[27rem]" : "md:max-w-[34rem]"}>
        <p className="label mb-6 md:mb-8">{chapter.label}</p>

        <h2
          className={[
            "display text-paper",
            isHero
              ? "text-[3.4rem] leading-[0.95] sm:text-7xl md:text-[7.5rem]"
              : "text-[2.4rem] leading-[1.05] sm:text-5xl md:text-[3.9rem]",
          ].join(" ")}
        >
          {chapter.headline.map((line, i) => (
            <span key={line} className="block">
              {i === 0 && isHero ? (
                <span className="tracking-[0.14em]">{line}</span>
              ) : (
                line
              )}
            </span>
          ))}
        </h2>

        {chapter.copy && (
          <p className="copy mt-7 text-[0.9rem] text-paper/75 sm:text-[0.95rem] md:mt-9">
            {chapter.copy}
          </p>
        )}

        {chapter.note && (
          <p className="copy mt-7 text-[0.95rem] tracking-[0.01em] text-paper/75 md:mt-9 md:text-base">
            {chapter.note}
          </p>
        )}

        {chapter.id === "machine" && (
          <p className="mt-10 inline-flex items-center gap-3 text-[0.7rem] tracking-[0.24em] text-accent uppercase md:mt-12">
            <span className="h-px w-8 bg-accent/60" />
            Request a private appointment
          </p>
        )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Restrained engineering callouts, staggered across the performance chapter. */
function Callouts({ progress }: { progress: MotionValue<number> }) {
  return (
    <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
      {CALLOUTS.map((callout, i) => (
        <Callout key={callout.label} callout={callout} index={i} progress={progress} />
      ))}
    </div>
  );
}

function Callout({
  callout,
  index,
  progress,
}: {
  callout: (typeof CALLOUTS)[number];
  index: number;
  progress: MotionValue<number>;
}) {
  const start = 0.48 + index * 0.024;
  const opacity = useTransform(progress, (p) =>
    piecewise(p, [start, start + 0.03, 0.71, 0.75], [0, 1, 1, 0]),
  );
  const width = useTransform(
    progress,
    (p) => `${piecewise(p, [start, start + 0.05], [0, 2.75])}rem`,
  );

  return (
    <motion.div
      style={{ opacity }}
      className={`absolute flex flex-col gap-2 ${CALLOUT_CLASS[callout.position]}`}
    >
      <span className="flex items-center gap-2">
        <span className="size-[3px] rounded-full bg-accent" />
        <motion.span style={{ width }} className="block h-px bg-accent/40" />
      </span>
      <span className="label text-paper/55">{callout.label}</span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * Reduced motion: the same chapters, stacked and static.
 * ------------------------------------------------------------------ */

export function StackedNarrative() {
  return (
    <div className="mx-auto max-w-5xl px-6 pb-28 sm:px-10 md:pb-40">
      {CHAPTERS.map((chapter) => (
        <article
          key={chapter.id}
          className="border-t border-paper/10 py-14 first:border-t-0 md:py-20"
        >
          <p className="label mb-6">{chapter.label}</p>
          <h2 className="display text-[2.4rem] leading-[1.05] text-paper sm:text-5xl md:text-[4rem]">
            {chapter.headline.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h2>
          {chapter.copy && (
            <p className="copy mt-8 max-w-2xl text-[0.95rem]">{chapter.copy}</p>
          )}
          {chapter.note && <p className="copy mt-8 text-base">{chapter.note}</p>}
          {chapter.id === "performance" && (
            <ul className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
              {CALLOUTS.map((callout) => (
                <li key={callout.label} className="label text-paper/55">
                  {callout.label}
                </li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  );
}
