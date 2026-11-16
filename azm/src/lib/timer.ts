// منطق المؤقت: بدء، إنهاء، إيقاف. المؤقت الشغّال محفوظ فيكمل لو سكّرت الصفحة.
import { addSession, getActiveTimer, setActiveTimer } from "./db";
import type { ActiveTimer, TimerMode } from "./types";

export const POMODORO = { work: 25, break: 5 };
export const WINDOW_CHOICES = [45, 60, 75, 90, 120];

export interface TimerInput {
  mode: TimerMode;
  phase: ActiveTimer["phase"];
  task: string;
  trackId: string | null;
  frog: boolean;
  minutes: number;
}

export async function startTimer(input: TimerInput, speed = 1): Promise<void> {
  const { minutes, ...rest } = input;
  const now = Date.now();
  await setActiveTimer({ ...rest, plannedMin: minutes, startedAt: now, endAt: now + (minutes * 60_000) / speed });
}

const iso = (ms: number) => new Date(ms).toISOString();

/** يسجّل جلسة مكتملة. يرجّع false إذا انسجلت من قبل (تبويب ثاني مثلًا). */
export async function finishTimer(t: ActiveTimer): Promise<boolean> {
  const current = await getActiveTimer();
  if (!current || current.startedAt !== t.startedAt) return false;
  if (t.phase === "work") {
    await addSession({
      mode: t.mode,
      task: t.task,
      trackId: t.trackId,
      frog: t.frog,
      startedAt: iso(t.startedAt),
      endedAt: iso(t.endAt),
      plannedMin: t.plannedMin,
      actualMin: t.plannedMin,
      completed: true,
    });
  }
  await setActiveTimer(null);
  return true;
}

/** إيقاف مبكّر: الدقائق اللي اشتغلتها تنحسب لك (بدون عقاب). */
export async function stopTimer(t: ActiveTimer): Promise<number> {
  let minutes = 0;
  if (t.phase === "work") {
    const ratio = (Date.now() - t.startedAt) / (t.endAt - t.startedAt);
    minutes = Math.min(t.plannedMin, Math.round(t.plannedMin * ratio));
    if (minutes >= 1) {
      await addSession({
        mode: t.mode,
        task: t.task,
        trackId: t.trackId,
        frog: t.frog,
        startedAt: iso(t.startedAt),
        endedAt: new Date().toISOString(),
        plannedMin: t.plannedMin,
        actualMin: minutes,
        completed: false,
      });
    }
  }
  await setActiveTimer(null);
  return minutes;
}
