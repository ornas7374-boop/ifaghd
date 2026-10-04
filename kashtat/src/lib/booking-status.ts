// مطابقة لنوع booking_status في قاعدة البيانات
export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "completed",
  "cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type StatusTone = "success" | "warning" | "danger" | "info" | "sand" | "neutral";

// كل حالة لها كلمة واضحة، اللون مساعد فقط
export const BOOKING_STATUS_META: Record<BookingStatus, { label: string; tone: StatusTone }> = {
  pending: { label: "بانتظار التأكيد", tone: "warning" },
  confirmed: { label: "مؤكد", tone: "success" },
  checked_in: { label: "في المكان", tone: "sand" },
  checked_out: { label: "غادر", tone: "info" },
  completed: { label: "مكتمل", tone: "info" },
  cancelled: { label: "ملغي", tone: "danger" },
};

/** رقم حجز تجريبي بصيغة KS-000123 (لأمثلة الواجهة فقط) */
export function formatBookingId(n: number): string {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError("booking number must be a non-negative integer");
  }
  return `KS-${String(n).padStart(6, "0")}`;
}
