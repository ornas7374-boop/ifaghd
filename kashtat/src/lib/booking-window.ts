import { addDays, addHoursToTime, formatDateShort, formatTime12 } from "@/lib/dates";
import type { RateUnit } from "@/lib/pricing";

/** وصف نافذة الحجز كما تحسبها دالة create_booking (أوقات المكان بتوقيت الرياض) */
export function describeWindow(o: {
  unit: RateUnit;
  date: Date;
  duration: number;
  from?: string;
  checkIn: string;
  checkOut: string;
}): string {
  const { unit, date, duration } = o;
  if (unit === "hour") {
    const from = o.from ?? o.checkIn;
    return `${formatDateShort(date)} · ${formatTime12(from)} – ${formatTime12(addHoursToTime(from, duration))}`;
  }
  if (unit === "day") {
    return `من ${formatDateShort(date)} ${formatTime12(o.checkIn)} إلى ${formatDateShort(addDays(date, duration))} ${formatTime12(o.checkIn)}`;
  }
  return `دخول ${formatDateShort(date)} ${formatTime12(o.checkIn)} · خروج ${formatDateShort(addDays(date, duration))} ${formatTime12(o.checkOut)}`;
}

export const UNIT_COUNT: Record<RateUnit, string> = { hour: "ساعة", day: "يوم", night: "ليلة" };
