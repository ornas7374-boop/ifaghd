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
  CalendarPrefs,
  Constitution,
  ControlItem,
  Task,
  WeeklyReview,
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
  program: "program-done",
  reviews: "reviews",
  control: "control",
  tasks: "tasks",
  constitution: "constitution",
  calendar: "calendar",
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

// ---------- العادات (إدارة) ----------
export async function addHabit(name: string): Promise<void> {
  const habit: Habit = { id: newId(), name, createdAt: toDateKey(), doneDates: [] };
  await save(KEYS.habits, [...(await getHabits()), habit]);
}

export async function updateHabit(id: string, patch: Partial<Habit>): Promise<void> {
  await save(KEYS.habits, (await getHabits()).map((h) => (h.id === id ? { ...h, ...patch } : h)));
}

// ---------- برنامج الـ30 يوم ----------
export async function getProgramDone(): Promise<number[]> {
  return (await storage.read<number[]>(KEYS.program)) ?? [];
}

export async function toggleProgramDay(day: number): Promise<void> {
  const done = await getProgramDone();
  await save(KEYS.program, done.includes(day) ? done.filter((d) => d !== day) : [...done, day].sort((a, b) => a - b));
}

// ---------- المحاسبة الأسبوعية ----------
export async function getReviews(): Promise<WeeklyReview[]> {
  return (await storage.read<WeeklyReview[]>(KEYS.reviews)) ?? [];
}

export async function saveReview(review: Omit<WeeklyReview, "id">): Promise<void> {
  const reviews = await getReviews();
  const existing = reviews.find((r) => r.date === review.date);
  const next = existing
    ? reviews.map((r) => (r.date === review.date ? { ...review, id: r.id } : r))
    : [...reviews, { ...review, id: newId() }];
  await save(KEYS.reviews, next);
}

// ---------- المهام ----------
export async function getTasks(): Promise<Task[]> {
  return (await storage.read<Task[]>(KEYS.tasks)) ?? [];
}

export async function addTasks(items: Omit<Task, "id" | "createdAt" | "done">[]): Promise<Task[]> {
  const now = new Date().toISOString();
  const created = items.map((t) => ({ ...t, id: newId(), createdAt: now, done: false }));
  await save(KEYS.tasks, [...(await getTasks()), ...created]);
  return created;
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  await save(KEYS.tasks, (await getTasks()).map((t) => (t.id === id ? { ...t, ...patch } : t)));
}

export async function deleteTask(id: string): Promise<void> {
  await save(KEYS.tasks, (await getTasks()).filter((t) => t.id !== id));
}

// ---------- ثنائية التحكم ----------
export async function getControlItems(): Promise<ControlItem[]> {
  return (await storage.read<ControlItem[]>(KEYS.control)) ?? [];
}

export async function saveControlItems(items: ControlItem[]): Promise<void> {
  await save(KEYS.control, items);
}

// ---------- الدستور ----------
export const DEFAULT_CONSTITUTION: Constitution = {
  principles: "أبدأ قبل ما أكون جاهز. مُرسَل أحسن من ممتاز. لا أفوّت مرتين.",
  fixedPlans: "",
  sleep: "23:00",
  wake: "06:00",
  envRules: ["الجوال برا الغرفة وقت ساعة الضفدع", "تبويب واحد مفتوح وقت الشغل", "تطبيقات التواصل مو على الشاشة الرئيسية"],
  emergency:
    "1. أسمّي الشعور.\n2. أتنفس دقيقة (4-4-4-4).\n3. أصغّر الخطوة لين تصير سخيفة.\n4. أبعد الجوال وأسكّر التبويبات.\n5. 10 دقائق بس، وبعدها أنا حر.\nإذا ما قدرت: أسامح نفسي وأكتب خطة إذا–فإن لأقرب فرصة.",
};

export async function getConstitution(): Promise<Constitution> {
  return { ...DEFAULT_CONSTITUTION, ...((await storage.read<Constitution>(KEYS.constitution)) ?? {}) };
}

export async function saveConstitution(c: Constitution): Promise<void> {
  await save(KEYS.constitution, { ...c, updatedAt: new Date().toISOString() });
}

// ---------- التقويم ----------
export const DEFAULT_CALENDAR: CalendarPrefs = {
  frog: true,
  planning: true,
  review: true,
  plans: true,
  windows: true,
  planningTime: "21:30",
  reviewTime: "20:00",
  windowSlots: [],
};

export async function getCalendarPrefs(): Promise<CalendarPrefs> {
  return { ...DEFAULT_CALENDAR, ...((await storage.read<CalendarPrefs>(KEYS.calendar)) ?? {}) };
}

export async function updateCalendarPrefs(patch: Partial<CalendarPrefs>): Promise<void> {
  await save(KEYS.calendar, { ...(await getCalendarPrefs()), ...patch });
}

// ---------- نسخ احتياطي ----------
const PREFIX_KEYS = () => Object.values(KEYS).filter((k): k is string => typeof k === "string");

export async function exportAll(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { app: "azm", version: 1, exportedAt: new Date().toISOString(), data: {} };
  const data = out.data as Record<string, unknown>;
  for (const k of PREFIX_KEYS()) data[k] = await storage.read(k);
  // أيام «المهمة الوحدة»
  if (typeof window !== "undefined") {
    for (let i = 0; i < window.localStorage.length; i++) {
      const full = window.localStorage.key(i) ?? "";
      if (full.startsWith("azm:v1:day:")) {
        const k = full.slice("azm:v1:".length);
        data[k] = await storage.read(k);
      }
    }
  }
  return out;
}

export async function importAll(backup: { app?: string; data?: Record<string, unknown> }): Promise<void> {
  if (backup.app !== "azm" || !backup.data) throw new Error("الملف مو نسخة احتياطية من عَزم");
  for (const [k, v] of Object.entries(backup.data)) {
    if (v === null || v === undefined) await storage.remove(k);
    else await storage.write(k, v);
  }
  listeners.forEach((l) => l());
}
