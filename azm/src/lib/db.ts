/**
 * المستودعات (repositories): الطبقة الوحيدة اللي تكلّم المخزن.
 * المكونات تستدعي هالدوال بس، وما تعرف وش المخزن تحتها.
 */
import { storage } from "./storage";
import { toDateKey } from "./date";
import { newId } from "./id";
import { DEFAULT_HABITS, DEFAULT_TRACKS } from "./content/defaults";
import type {
  ActiveTimer,
  DateKey,
  DayRecord,
  Frog,
  Habit,
  IfThenPlan,
  ProcrastinationEntry,
  Session,
  Settings,
  StuckEntry,
} from "./types";

const KEYS = {
  settings: "settings",
  day: (d: DateKey) => `day:${d}`,
  plans: "plans",
  habits: "habits",
  stuck: "stuck-log",
  sessions: "sessions",
  activeTimer: "active-timer",
  procrastination: "procrastination-log",
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
  const today = toDateKey();
  const defaults: Settings = {
    startDate: today,
    frogTime: "07:00",
    tracks: DEFAULT_TRACKS,
    windowMinutes: 60,
    windowChangedAt: today,
  };
  if (stored?.startDate) return { ...defaults, windowChangedAt: stored.startDate, ...stored };
  await storage.write(KEYS.settings, defaults);
  return defaults;
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

export async function updatePlan(id: string, patch: Partial<IfThenPlan>): Promise<void> {
  await save(KEYS.plans, (await getPlans()).map((p) => (p.id === id ? { ...p, ...patch } : p)));
}

export async function deletePlan(id: string): Promise<void> {
  await save(KEYS.plans, (await getPlans()).filter((p) => p.id !== id));
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

// ---------- جلسات المؤقت ----------
export async function getSessions(): Promise<Session[]> {
  return (await storage.read<Session[]>(KEYS.sessions)) ?? [];
}

export async function addSession(session: Omit<Session, "id">): Promise<void> {
  await save(KEYS.sessions, [...(await getSessions()), { ...session, id: newId() }]);
}

export async function getActiveTimer(): Promise<ActiveTimer | null> {
  return storage.read<ActiveTimer>(KEYS.activeTimer);
}

export async function setActiveTimer(timer: ActiveTimer | null): Promise<void> {
  if (timer) await save(KEYS.activeTimer, timer);
  else {
    await storage.remove(KEYS.activeTimer);
    listeners.forEach((l) => l());
  }
}

// ---------- سجل التسويف ----------
export async function getProcrastinationLog(): Promise<ProcrastinationEntry[]> {
  return (await storage.read<ProcrastinationEntry[]>(KEYS.procrastination)) ?? [];
}

export async function addProcrastination(entry: Omit<ProcrastinationEntry, "id" | "at">): Promise<void> {
  const full: ProcrastinationEntry = { ...entry, id: newId(), at: new Date().toISOString() };
  await save(KEYS.procrastination, [...(await getProcrastinationLog()), full]);
}

export async function deleteProcrastination(id: string): Promise<void> {
  await save(KEYS.procrastination, (await getProcrastinationLog()).filter((e) => e.id !== id));
}
