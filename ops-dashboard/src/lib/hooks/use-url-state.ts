"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Read/write a single query-string param. Writes use `replace` + no scroll, so
 * filters, tabs and open panels are shareable links without polluting history.
 */
export function useUrlState<T extends string>(key: string, fallback: T, allowed?: readonly T[]) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get(key) as T | null;
  const value = raw && (!allowed || allowed.includes(raw)) ? raw : fallback;

  const setValue = useCallback(
    (next: T | null) => {
      const sp = new URLSearchParams(window.location.search);
      if (next === null || next === fallback) sp.delete(key);
      else sp.set(key, next);
      const qs = sp.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [key, fallback, pathname, router],
  );

  return [value, setValue] as const;
}

/** Nullable variant — for things like the open record id in a side panel. */
export function useUrlParam(key: string) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const value = params.get(key);
  const setValue = useCallback(
    (next: string | null, extra?: Record<string, string | null>) => {
      const sp = new URLSearchParams(window.location.search);
      const all = { [key]: next, ...extra };
      for (const [k, v] of Object.entries(all)) {
        if (v === null) sp.delete(k);
        else sp.set(k, v);
      }
      const qs = sp.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [key, pathname, router],
  );
  return [value, setValue] as const;
}
