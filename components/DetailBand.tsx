"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

import { DETAILS } from "@/lib/content";
import { piecewise } from "@/lib/ramp";

/**
 * Full-bleed macro photography. The band drifts horizontally against the page
 * scroll; the drift is dropped entirely under reduced motion.
 */
export function DetailBand() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const x = useTransform(
    scrollYProgress,
    (p) => `${piecewise(p, [0, 1], [2, -16])}%`,
  );

  return (
    <section
      ref={sectionRef}
      className="overflow-hidden border-t border-paper/10 bg-ink py-24 md:py-36"
    >
      <div className="mx-auto mb-14 max-w-[92rem] px-6 sm:px-10 md:mb-20">
        <p className="label">Detail</p>
        <h2 className="display mt-7 max-w-2xl text-[2.2rem] leading-[1.08] text-paper sm:text-4xl md:text-[3.4rem]">
          Seen closer than most will ever see it.
        </h2>
      </div>

      <motion.div
        style={reduced ? undefined : { x }}
        className="flex gap-4 will-change-transform md:gap-6"
      >
        {DETAILS.map((detail) => (
          <figure
            key={detail.src}
            className="w-[58vw] shrink-0 sm:w-[38vw] md:w-[27vw] lg:w-[21vw]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={detail.src}
              alt={detail.alt}
              width={900}
              height={1125}
              loading="lazy"
              decoding="async"
              className="w-full select-none"
              draggable={false}
            />
            <figcaption className="label mt-5 text-paper/40">
              {detail.caption}
            </figcaption>
          </figure>
        ))}
      </motion.div>
    </section>
  );
}
