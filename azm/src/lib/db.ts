/**
 * المستودعات (repositories): الطبقة الوحيدة اللي تكلّم المخزن.
 * المكونات تستدعي هالدوال بس، وما تعرف وش المخزن تحتها.
 */
import { storage } from "./storage";
import { toDateKey } from "./date";
import { newId } from "./id";
import { DEFAULT_HABITS, DEFAULT_TRACKS } from "./content/defaults";
import type { DateKey, DayRecord, Frog, Habit, IfThenPlan, Settings, StuckEntry } from "./types";

const KEYS = {
  settings: "settings",
  day: (d: DateKey) => `day:${d}`,
  plans: "plans",
  habits: "habits",
  stuck: "stuck-log",
};

// إشعار بسيط عشان أي شاشة مفتوحة تتحدّث لما تتغير البيانات.
type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
async function save<T>(key: string, value: T) {
  await storage.write(key, value);
  listeners.forEach((l) => l());
}

// ---------- الإعدادات ----------
export async function getSettings(): Promise<Settings> {
  const stored = await storage.read<Partial<Settings>>(KEYS.settings);
  if (stored?.startDate) {
    return { frogTime: "07:00", tracks: DEFAULT_TRACKS, ...stored } as Settings;
  }
  const fresh: Settings = { startDate: toDateKey(), frogTime: "07:00", tracks: DEFAULT_TRACKS };
  await storage.write(KEYS.settings, fresh);
  return fresh;
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await save(KEYS.settings, { ...current, ...patch });
}

// ---------- اليوم والضفدع ----------
export async function getDay(date: DateKey): Promise<DayRecord> {
  return (await storage.read<DayRecord>(KEYS.day(date))) ?? { date };
}

export async function setFrog(date: DateKey, frog: Frog | undefined): Promise<void> {
  const day = await getDay(date);
  await save(KEYS.day(date), { ...day, frog });
}

export async function updateFrog(date: DateKey, patch: Partial<Frog>): Promise<void> {
  const day = await getDay(date);
  if (!day.frog) return;
  await save(KEYS.day(date), { ...day, frog: { ...day.frog, ...patch } });
}

// ---------- خطط إذا–فإن ----------
export async function getPlans(): Promise<IfThenPlan[]> {
  return (await storage.read<IfThenPlan[]>(KEYS.plans)) ?? [];
}

export async function addPlan(
  plan: Omit<IfThenPlan, "id" | "createdAt" | "active">,
): Promise<IfThenPlan> {
  const full: IfThenPlan = { ...plan, id: newId(), createdAt: new Date().toISOString(), active: true };
  await save(KEYS.plans, [...(await getPlans()), full]);
  return full;
}

// ---------- العادات ----------
export async function getHabits(): Promise<Habit[]> {
  const stored = await storage.read<Habit[]>(KEYS.habits);
  if (stored) return stored;
  const today = toDateKey();
  const seeded = DEFAULT_HABITS.map((name) => ({ id: newId(), name, createdAt: today, doneDates: [] }));
  await storage.write(KEYS.habits, seeded);
  return seeded;
}

export async function toggleHabit(id: string, date: DateKey): Promise<void> {
  const habits = await getHabits();
  await save(
    KEYS.habits,
    habits.map((h) =>
      h.id !== id
        ? h
        : {
            ...h,
            doneDates: h.doneDates.includes(date)
              ? h.doneDates.filter((d) => d !== date)
              : [...h.doneDates, date].sort(),
          },
    ),
  );
}

// ---------- سجل الطوارئ ----------
export async function getStuckLog(): Promise<StuckEntry[]> {
  return (await storage.read<StuckEntry[]>(KEYS.stuck)) ?? [];
}

export async function addStuckEntry(entry: Omit<StuckEntry, "id" | "at">): Promise<void> {
  const full: StuckEntry = { ...entry, id: newId(), at: new Date().toISOString() };
  await save(KEYS.stuck, [...(await getStuckLog()), full]);
}
