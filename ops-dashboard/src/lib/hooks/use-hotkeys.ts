"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

export type HotkeyMap = Record<string, (e: KeyboardEvent) => void>;

function isTyping(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/**
 * Keyboard shortcuts with Linear-style sequences.
 *   "mod+k"  → ⌘K / Ctrl+K (fires even while typing)
 *   "g o"    → press G, then O within 800ms
 *   "c", "/", "?", "escape", "j", "k"
 * Single keys and sequences are ignored while focus is in a text field.
 */
export function useHotkeys(map: HotkeyMap, enabled = true) {
  const mapRef = useRef(map);
  useLayoutEffect(() => {
    mapRef.current = map;
  });

  useEffect(() => {
    if (!enabled) return;
    let pending: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onKey = (e: KeyboardEvent) => {
      const m = mapRef.current;
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        const combo = `mod+${key}`;
        if (m[combo]) {
          e.preventDefault();
          m[combo](e);
        }
        return;
      }
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      if (key === "escape" && m.escape) {
        m.escape(e);
        return;
      }
      if (isTyping(e)) return;

      if (pending) {
        const seq = `${pending} ${key}`;
        pending = null;
        clearTimeout(timer);
        if (m[seq]) {
          e.preventDefault();
          m[seq](e);
          return;
        }
      }
      if (Object.keys(m).some((k) => k.startsWith(`${key} `))) {
        pending = key;
        timer = setTimeout(() => (pending = null), 800);
        return;
      }
      const single = e.key === "?" ? "?" : key;
      if (m[single]) {
        e.preventDefault();
        m[single](e);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer);
    };
  }, [enabled]);
}
