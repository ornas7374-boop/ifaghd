"use client";

import { useSyncExternalStore } from "react";

// One shared ticker for the whole app, so every "3m ago" label updates together.
let current = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const subs = new Set<() => void>();

function subscribe(cb: () => void) {
  subs.add(cb);
  if (!timer) {
    current = Date.now();
    timer = setInterval(() => {
      current = Date.now();
      subs.forEach((f) => f());
    }, 30_000);
  }
  return () => {
    subs.delete(cb);
    if (!subs.size) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Current time, refreshed every 30s. `null` on the server/hydration pass to avoid mismatches. */
export function useNow() {
  return useSyncExternalStore(
    subscribe,
    () => current || (current = Date.now()),
    () => null,
  );
}
