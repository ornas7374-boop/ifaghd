// كل أنواع البيانات في مكان واحد — نفس الشكل يصلح لـ localStorage ولـ Supabase لاحقًا.

export type DateKey = string; // "YYYY-MM-DD" بالتوقيت المحلي

export interface Track {
  id: string;
  name: string;
}

export interface Settings {
  startDate: DateKey; // أول يوم في برنامج الـ30 يوم
  frogTime: string; // "HH:MM"
  tracks: Track[];
  windowMinutes: number; // طول «نافذة مونستر» الافتراضي
  windowChangedAt: DateKey; // آخر مرة تغيّر طول النافذة أو تأجل الاقتراح
}

export interface Frog {
  text: string;
  trackId: string | null;
  done: boolean;
  doneAt?: string;
}

export interface DayRecord {
  date: DateKey;
  frog?: Frog;
}

export type TriggerKind = "prayer" | "time" | "event";

export interface IfThenPlan {
  id: string;
  trigger: string; // «بعد العصر»
  triggerKind: TriggerKind;
  time: string | null; // "HH:MM" للتقويم
  action: string; // «أفتح ملف المتجر وأكتب وصف منتج واحد»
  trackId: string | null;
  active: boolean;
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  createdAt: DateKey;
  doneDates: DateKey[];
  archived?: boolean;
}

export type FeelingId = "bored" | "anxious" | "fear" | "exhausted" | "lost" | "other";

export type StuckOutcome = "continued" | "stopped" | "not_started";

export interface StuckEntry {
  id: string;
  at: string; // ISO
  feeling: FeelingId;
  feelingNote?: string;
  task: string;
  tinyStep: string;
  outcome: StuckOutcome;
  planId?: string;
}

export type TimerMode = "pomodoro" | "window";

export interface Session {
  id: string;
  mode: TimerMode;
  task: string;
  trackId: string | null;
  frog: boolean; // جلسة على «المهمة الوحدة» لليوم
  startedAt: string; // ISO
  endedAt: string; // ISO
  plannedMin: number;
  actualMin: number;
  completed: boolean; // كمّل المدة كاملة
}

/** المؤقت الشغّال الحين — محفوظ عشان يكمل لو سكّرت الصفحة. */
export interface ActiveTimer {
  mode: TimerMode;
  phase: "work" | "break";
  task: string;
  trackId: string | null;
  frog: boolean;
  startedAt: number; // ms
  endAt: number; // ms
  plannedMin: number;
}

export interface ProcrastinationEntry {
  id: string;
  at: string; // ISO
  task: string;
  feeling: FeelingId;
  trackId: string | null;
  instead: string; // وش سويت بدالها
}
