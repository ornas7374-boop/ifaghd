/**
 * Hero sequence: metadata plus a progressive, off-main-thread frame loader.
 *
 * The frames are every frame of the reference clip — one continuous 4.2s orbit
 * of the car, front three-quarter through flank to rear three-quarter. See
 * tools/extract_clip_frames.py.
 *
 * The loader never blocks scrolling. It fetches a coarse pass across the whole
 * sequence first so scrubbing is usable within the first second, then refines
 * in passes until every frame is resident. Decoding happens through
 * `img.decode()` so the codec work stays off the main thread and the canvas
 * only ever draws frames that are already decoded.
 */

import { withBasePath } from "@/lib/basePath";

export const FRAME_COUNT = 184;

export type SequenceSet = "desktop" | "mobile";

// Roughly 2:1 — the reference clip's native aspect, kept rather than padded.
export const SEQUENCE_SETS: Record<SequenceSet, { width: number; height: number }> = {
  desktop: { width: 1440, height: 724 },
  mobile: { width: 900, height: 453 },
};

export function frameSrc(set: SequenceSet, index: number): string {
  return withBasePath(`/sequence/${set}/frame_${String(index).padStart(4, "0")}.jpg`);
}

/** Frame indices ordered coarse-to-fine, so early scrubs always find something. */
function loadOrder(count: number): number[] {
  const order: number[] = [];
  const seen = new Set<number>();
  const push = (i: number) => {
    if (i >= 0 && i < count && !seen.has(i)) {
      seen.add(i);
      order.push(i);
    }
  };

  push(0);
  push(count - 1);
  for (const stride of [16, 8, 4, 2, 1]) {
    for (let i = 0; i < count; i += stride) push(i);
  }
  return order;
}

export class SequenceLoader {
  readonly frames: (HTMLImageElement | undefined)[];

  private readonly set: SequenceSet;
  private readonly order: number[];
  private cursor = 0;
  private inFlight = 0;
  private stopped = false;
  private loadedCount = 0;

  /** Called after each frame lands, so the canvas can redraw if it was waiting. */
  onFrame?: (index: number, loaded: number, total: number) => void;

  constructor(set: SequenceSet, private readonly concurrency = 6) {
    this.set = set;
    this.frames = new Array(FRAME_COUNT);
    this.order = loadOrder(FRAME_COUNT);
  }

  get loaded(): number {
    return this.loadedCount;
  }

  start(): void {
    for (let i = 0; i < this.concurrency; i += 1) this.pump();
  }

  stop(): void {
    this.stopped = true;
  }

  /**
   * Nearest already-decoded frame to `index`. Guarantees the canvas always has
   * something to draw, so a partially loaded sequence degrades to a coarser
   * scrub rather than to a blank or a flash.
   */
  nearestLoaded(index: number): HTMLImageElement | undefined {
    const exact = this.frames[index];
    if (exact) return exact;
    for (let d = 1; d < FRAME_COUNT; d += 1) {
      const before = this.frames[index - d];
      if (before) return before;
      const after = this.frames[index + d];
      if (after) return after;
    }
    return undefined;
  }

  private pump(): void {
    if (this.stopped || this.cursor >= this.order.length) return;
    if (this.inFlight >= this.concurrency) return;

    const index = this.order[this.cursor];
    this.cursor += 1;

    if (this.frames[index]) {
      this.pump();
      return;
    }

    this.inFlight += 1;
    const img = new Image();
    img.decoding = "async";
    img.src = frameSrc(this.set, index);

    const settle = (ok: boolean) => {
      this.inFlight -= 1;
      if (ok && !this.stopped) {
        this.frames[index] = img;
        this.loadedCount += 1;
        this.onFrame?.(index, this.loadedCount, FRAME_COUNT);
      }
      this.pump();
    };

    // decode() resolves once the bitmap is ready to paint, off the main thread
    // where the browser supports it. Older engines fall back to onload.
    if (typeof img.decode === "function") {
      img
        .decode()
        // Some engines reject decode() for images that painted fine; fall back
        // to the completed bitmap rather than dropping the frame.
        .then(() => settle(true), () => settle(img.complete && img.naturalWidth > 0));
    } else {
      img.onload = () => settle(true);
      img.onerror = () => settle(false);
    }
  }
}
