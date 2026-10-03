// تواريخ ميلادية بأسماء أشهر عربية وأرقام لاتينية
const LOCALE = "ar-SA-u-ca-gregory-nu-latn";

export const WEEKDAYS_SHORT = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

const monthFormat = new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric" });
const longFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const shortFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: "short",
  day: "numeric",
  month: "short",
});

export function formatMonth(d: Date) {
  return monthFormat.format(d);
}

export function formatDateLong(d: Date) {
  return longFormat.format(d);
}

export function formatDateShort(d: Date) {
  return shortFormat.format(d);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function addMonths(d: Date, n: number): Date {
  // اليوم الأول من الشهر الهدف لتجنب القفز (31 يناير + شهر)
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** مفتاح ثابت YYYY-MM-DD بالتوقيت المحلي */
export function toDateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  return date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

/**
 * شبكة شهر كاملة تبدأ من الأحد: 6 أسابيع × 7 أيام.
 * الأيام خارج الشهر موجودة (inMonth=false) لتبقى الشبكة ثابتة.
 */
export function monthGrid(month: Date): Array<{ date: Date; inMonth: boolean }> {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(start, i);
    return { date, inMonth: date.getMonth() === month.getMonth() };
  });
}
