"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "./use-reduced-motion";

const played = new Set<string>();

/** Counts up to `target` once per id per session; afterwards it just returns `target`. */
export function useCountUp(id: string, target: number, duration = 700) {
  const [skip] = useState(() => played.has(id) || prefersReducedMotion());
  const [value, setValue] = useState(0);
  const [done, setDone] = useState(skip);

  useEffect(() => {
    if (skip) return;
    played.add(id);
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setDone(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [id, target, duration, skip]);

  return done ? target : value;
}
