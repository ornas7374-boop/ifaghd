import type { Track } from "../types";

export const DEFAULT_TRACKS: Track[] = [
  { id: "store", name: "المتجر الرقمي" },
  { id: "ai", name: "خدمات أتمتة الذكاء الاصطناعي" },
  { id: "uni", name: "الدراسة الجامعية" },
];

export const DEFAULT_HABITS = ["نوم بموعد ثابت", "حركة 20 دقيقة", "دقيقتين تخطيط لبكرة"];

export const HABIT_TARGET_DAYS = 66;
export const PROGRAM_DAYS = 30;
