import type { DateKey } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateKey(d: Date = new Date()): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function keyToUTC(key: DateKey): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** عدد الأيام من a إلى b (b - a). */
export function daysBetween(a: DateKey, b: DateKey): number {
  return Math.round((keyToUTC(b) - keyToUTC(a)) / 86_400_000);
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = new Date(keyToUTC(key) + n * 86_400_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** رقم اليوم في السنة — نستخدمه لتدوير الاقتباس اليومي. */
export function dayOfYear(key: DateKey): number {
  const y = Number(key.slice(0, 4));
  return daysBetween(`${y}-01-01`, key);
}

export function formatToday(d: Date): { weekday: string; hijri: string; gregorian: string } {
  return {
    weekday: new Intl.DateTimeFormat("ar-SA-u-nu-latn", { weekday: "long" }).format(d),
    hijri: new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", {
      day: "numeric",
      month: "long",
    }).format(d),
    gregorian: new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
      day: "numeric",
      month: "long",
    }).format(d),
  };
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
