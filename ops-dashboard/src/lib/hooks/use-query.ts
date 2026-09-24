"use client";

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";

type Entry = { data?: unknown; error?: Error };
const cache = new Map<string, Entry>();
const inflight = new Set<string>();

export type QueryResult<T> = (
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "error"; data?: T; error: Error }
  | { status: "success"; data: T; error?: undefined }
) & { isFetching: boolean; retry: () => void };

/**
 * Tiny stale-while-revalidate hook. Cached data renders instantly (no skeleton
 * flash when you switch back to a range you've already seen) and refreshes
 * quietly in the background. Swap for TanStack Query when the app grows —
 * the call sites won't change much.
 */
export function useQuery<T>(key: string, fetcher: () => Promise<T>): QueryResult<T> {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  useLayoutEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let cancelled = false;
    inflight.add(key);
    Promise.resolve().then(() => !cancelled && rerender());
    fetcherRef
      .current()
      .then((data) => cache.set(key, { data }))
      .catch((error: Error) => cache.set(key, { data: cache.get(key)?.data, error }))
      .finally(() => {
        inflight.delete(key);
        if (!cancelled) rerender();
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const retry = useCallback(() => {
    const prev = cache.get(key);
    // Keep stale data visible while refetching; drop the error.
    cache.set(key, { data: prev?.data });
    if (prev?.data === undefined) cache.delete(key);
    setNonce((n) => n + 1);
  }, [key]);

  const entry = cache.get(key);
  const isFetching = inflight.has(key);
  if (entry?.error && !isFetching) return { status: "error", error: entry.error, data: entry.data as T | undefined, isFetching, retry };
  if (entry?.data !== undefined) return { status: "success", data: entry.data as T, isFetching, retry };
  return { status: "loading", isFetching, retry };
}
