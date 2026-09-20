import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

/** Fade in/out helper: 0 → 1 over `inFrames`, holds, 1 → 0 over `outFrames` at the end. */
export const useFadeInOut = (durationInFrames: number, inFrames = 12, outFrames = 12) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, inFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(
    frame,
    [durationInFrames - outFrames, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return Math.min(enter, exit);
};

/** Springy value from 0 → 1 starting at `delay` frames. */
export const useSpringIn = (delay = 0, damping = 12, mass = 0.6) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - delay,
    fps,
    config: { damping, mass, stiffness: 100 },
  });
};

/** Linear reveal from 0 → 1 between `start` and `end` frames. */
export const useReveal = (start: number, end: number) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

/** Smoothly count up from 0 → target between frames [start, end]. */
export const useCountUp = (target: number, start: number, end: number) => {
  const t = useReveal(start, end);
  // easeOutCubic for pleasing deceleration
  const eased = 1 - Math.pow(1 - t, 3);
  return target * eased;
};

/** Sinusoidal float, e.g. subtle 6-8 px hover on hero cards. */
export const useFloat = (amplitude = 6, periodFrames = 90) => {
  const frame = useCurrentFrame();
  return Math.sin((frame / periodFrames) * Math.PI * 2) * amplitude;
};

/** Format a number with a thousands separator. */
export const fmt = (n: number, digits = 0) => {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};
