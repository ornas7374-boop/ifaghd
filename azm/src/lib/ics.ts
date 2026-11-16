/**
 * مولّد ملفات iCalendar (RFC 5545) — بدون مكتبات ولا سيرفر.
 * UID ثابت لكل حدث: لو صدّرت الملف مرة ثانية، التقويم يحدّث الحدث بدل ما يكرره.
 */
import { addDays, toDateKey } from "./date";

export const TZ = "Asia/Riyadh";

export interface CalEvent {
  uid: string;
  title: string;
  description: string;
  start: string; // "HH:MM" بتوقيت الرياض
  minutes: number;
  rrule: string; // مثل "FREQ=DAILY"
  url?: string;
  alarmAtEnd?: boolean; // تنبيه إضافي عند النهاية (نوافذ العمل)
  cancelled?: boolean; // خطة موقوفة: نلغي الحدث القديم
}

const pad = (n: number) => String(n).padStart(2, "0");

export function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** طي الأسطر عند 75 بايت (مو حرف) — العربي حرفه بايتين، فلازم نحسب بالبايت. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // السطر التابع يبدأ بمسافة
    if (bytes + size > limit) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

/** أول تاريخ للحدث: اليوم، أو أقرب خميس للأسبوعي. */
export function firstDate(rrule: string, today: string): string {
  const m = rrule.match(/BYDAY=([A-Z]{2})/);
  if (!m) return today;
  const target = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"].indexOf(m[1]);
  const d = new Date(`${today}T12:00:00`).getDay();
  return addDays(today, (target - d + 7) % 7);
}

function localStamp(date: string, time: string, plusMin = 0): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + plusMin;
  const day = addDays(date, Math.floor(total / 1440));
  const mins = ((total % 1440) + 1440) % 1440;
  return `${day.replace(/-/g, "")}T${pad(Math.floor(mins / 60))}${pad(mins % 60)}00`;
}

function utcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildIcs(events: CalEvent[], now = new Date()): string {
  const today = toDateKey(now);
  const stamp = utcStamp(now);
  const sequence = Math.floor(now.getTime() / 1000) - 1_700_000_000; // يزيد مع كل تصدير
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Azm//Azm Reminders//AR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:عَزم",
    `X-WR-TIMEZONE:${TZ}`,
    "BEGIN:VTIMEZONE",
    `TZID:${TZ}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0300",
    "TZOFFSETTO:+0300",
    "TZNAME:+03",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  for (const e of events) {
    const date = firstDate(e.rrule, today);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `LAST-MODIFIED:${stamp}`,
      `SEQUENCE:${sequence}`,
      `DTSTART;TZID=${TZ}:${localStamp(date, e.start)}`,
      `DTEND;TZID=${TZ}:${localStamp(date, e.start, e.minutes)}`,
      `RRULE:${e.rrule}`,
      `SUMMARY:${escapeText(e.title)}`,
      `DESCRIPTION:${escapeText(e.description)}`,
    );
    if (e.url) lines.push(`URL:${e.url}`);
    if (e.cancelled) {
      lines.push("STATUS:CANCELLED");
    } else {
      lines.push("STATUS:CONFIRMED", "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(e.title)}`, "TRIGGER:-PT5M", "END:VALARM");
      if (e.alarmAtEnd) {
        lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeText("انتهت النافذة. وقّف الحين.")}`, "TRIGGER;RELATED=END:PT0M", "END:VALARM");
      }
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/** رابط «أضف لـ Google Calendar» لحدث مفرد (بدون API). */
export function googleCalendarUrl(e: CalEvent, now = new Date()): string {
  const date = firstDate(e.rrule, toDateKey(now));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${localStamp(date, e.start)}/${localStamp(date, e.start, e.minutes)}`,
    ctz: TZ,
    details: e.description,
    recur: `RRULE:${e.rrule}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
