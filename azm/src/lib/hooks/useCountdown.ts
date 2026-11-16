"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * مؤقت تنازلي مبني على وقت النهاية (مو على عدّ الثواني)،
 * عشان يبقى دقيق حتى لو قفلت الشاشة أو طلعت من المتصفح.
 */
export function useCountdown(durationMs: number, onDone?: () => void) {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [left, setLeft] = useState<number | null>(null); // null = ما بدأ
  const remaining = left ?? durationMs;
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (endAt === null) return;
    const tick = () => {
      const ms = endAt - Date.now();
      setLeft(Math.max(0, ms));
      if (ms <= 0) {
        setEndAt(null);
        doneRef.current?.();
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [endAt]);

  const start = useCallback(() => setEndAt(Date.now() + durationMs), [durationMs]);
  const reset = useCallback(() => {
    setEndAt(null);
    setLeft(null);
  }, []);

  return { remaining, running: endAt !== null, start, reset, progress: 1 - remaining / durationMs };
}

/** يمنع الشاشة من الانطفاء وقت المؤقت (إذا المتصفح يدعم). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock
      .request("screen")
      .then((l) => (lock = l))
      .catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, [active]);
}

/** تنبيه خفيف عند انتهاء المؤقت: اهتزاز + نغمة قصيرة. */
export function chime() {
  try {
    navigator.vibrate?.([200, 100, 200]);
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.25].forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = i ? 784 : 523;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.65);
    });
  } catch {
    // الصوت اختياري
  }
}

/** يقرأ عَلَم من الرابط (مثل ‎?fast=1) بدون مشاكل hydration. */
export function useQueryFlag(name: string): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).has(name),
    () => false,
  );
}

/** للاختبار: ‎?fast=1 في الرابط يخلي كل دقيقة ثانية وحدة. */
export function useSpeed(): number {
  return useQueryFlag("fast") ? 60 : 1;
}

/**
 * الوقت الباقي حتى endAt (ثابت ومحفوظ)، ويستدعي onDone مرة وحدة عند الوصول.
 * قبل أول نبضة يرجّع initialMs.
 */
export function useRemaining(endAt: number, initialMs: number, onDone: () => void): number {
  const [left, setLeft] = useState<number | null>(null);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let fired = false;
    const tick = () => {
      const ms = endAt - Date.now();
      setLeft(Math.max(0, ms));
      if (ms <= 0 && !fired) {
        fired = true;
        doneRef.current();
      }
    };
    const id = window.setInterval(tick, 250);
    const first = window.setTimeout(tick, 0);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(first);
    };
  }, [endAt]);

  return left ?? initialMs;
}
