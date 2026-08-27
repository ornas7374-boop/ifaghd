/**
 * Piecewise-linear ramp used by every scroll-driven value on the page.
 *
 * Framer will happily compile a `useTransform` range into a WAAPI keyframe
 * animation, where the stops become timeline offsets — which only behaves for
 * ranges whose stops sit inside [0, 1] and span it. Partial ranges silently
 * extrapolate instead of clamping, which faded finished chapters back in over
 * live ones. Passing a function to `useTransform` keeps the mapping exact and
 * clamped at both ends, and costs a few arithmetic ops per frame.
 */
export function piecewise(p: number, stops: number[], values: number[]): number {
  if (p <= stops[0]) return values[0];

  for (let i = 1; i < stops.length; i += 1) {
    if (p <= stops[i]) {
      const span = stops[i] - stops[i - 1];
      if (span <= 0) return values[i];
      const t = (p - stops[i - 1]) / span;
      return values[i - 1] + (values[i] - values[i - 1]) * t;
    }
  }
  return values[values.length - 1];
}
