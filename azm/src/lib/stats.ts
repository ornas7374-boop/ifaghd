// حسابات التحليل — دوال صافية بدون تخزين، سهلة الاختبار.
import { addDays, daysBetween, toDateKey } from "./date";
import type { DateKey, FeelingId, ProcrastinationEntry, Session } from "./types";

export const dateOf = (iso: string): DateKey => toDateKey(new Date(iso));

export function countBy<T, K extends string>(items: T[], key: (t: T) => K | null): [K, number][] {
  const map = new Map<K, number>();
  for (const it of items) {
    const k = key(it);
    if (k !== null) map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export type DayPart = "dawn" | "morning" | "noon" | "afternoon" | "evening" | "night";

export const DAY_PARTS: Record<DayPart, string> = {
  dawn: "الفجر · من 3 إلى 6 الصبح",
  morning: "الصباح · من 6 إلى 11",
  noon: "الظهر · من 11 إلى 2",
  afternoon: "العصر · من 2 إلى 5",
  evening: "المساء · من 5 إلى 9",
  night: "الليل · من 9 إلى 3 الفجر",
};

export function dayPart(iso: string): DayPart {
  const h = new Date(iso).getHours();
  if (h >= 3 && h < 6) return "dawn";
  if (h < 11 && h >= 6) return "morning";
  if (h < 14 && h >= 11) return "noon";
  if (h < 17 && h >= 14) return "afternoon";
  if (h < 21 && h >= 17) return "evening";
  return "night";
}

/** عدد الإدخالات لكل يوم في آخر 7 أيام (الأقدم أولًا). */
export function lastSevenDays<T>(items: T[], at: (t: T) => string, today: DateKey) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, count: items.filter((it) => dateOf(at(it)) === date).length };
  });
}

export interface Insights {
  total: number;
  topFeeling: [FeelingId, number] | null;
  topTrack: [string, number] | null;
  topPart: [DayPart, number] | null;
  week: { date: DateKey; count: number }[];
}

export function analyze(log: ProcrastinationEntry[], today: DateKey): Insights {
  return {
    total: log.length,
    topFeeling: countBy(log, (e) => e.feeling)[0] ?? null,
    topTrack: countBy(log, (e) => e.trackId)[0] ?? null,
    topPart: countBy(log, (e) => dayPart(e.at))[0] ?? null,
    week: lastSevenDays(log, (e) => e.at, today),
  };
}

// ---------- الجلسات ----------
export function minutesOn(sessions: Session[], date: DateKey) {
  return sessions.filter((s) => dateOf(s.startedAt) === date).reduce((sum, s) => sum + s.actualMin, 0);
}

export function minutesSince(sessions: Session[], from: DateKey) {
  return sessions.filter((s) => daysBetween(from, dateOf(s.startedAt)) >= 0).reduce((sum, s) => sum + s.actualMin, 0);
}

/** المسارات اللي خلصت نافذتها اليوم — ممنوع ترجع لها لين بكرة. */
export function lockedTracksToday(sessions: Session[], today: DateKey): Set<string> {
  return new Set(
    sessions
      .filter((s) => s.mode === "window" && s.completed && s.trackId && dateOf(s.startedAt) === today)
      .map((s) => s.trackId!),
  );
}

/**
 * عدد الأيام المتتالية (لين اليوم أو أمس) اللي التزمت فيها بنافذة كاملة،
 * محسوبة بعد آخر تغيير لطول النافذة. ما تنعرض كسلسلة، تُستخدم للاقتراح بس.
 */
export function windowStreak(sessions: Session[], today: DateKey, since: DateKey): number {
  const days = new Set(sessions.filter((s) => s.mode === "window" && s.completed).map((s) => dateOf(s.startedAt)));
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor) && daysBetween(since, cursor) >= 0) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export const WINDOW_STREAK_FOR_SUGGESTION = 5;
export const WINDOW_STEP_MIN = 15;
