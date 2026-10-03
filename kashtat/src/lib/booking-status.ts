export const BOOKING_STATUSES = [
  "pending_payment",
  "confirmed",
  "cancelled",
  "completed",
  "refunded",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type StatusTone = "success" | "warning" | "danger" | "info" | "sand" | "neutral";

// كل حالة لها كلمة واضحة، اللون مساعد فقط
export const BOOKING_STATUS_META: Record<BookingStatus, { label: string; tone: StatusTone }> = {
  pending_payment: { label: "بانتظار الدفع", tone: "warning" },
  confirmed: { label: "مؤكد", tone: "success" },
  cancelled: { label: "ملغي", tone: "danger" },
  completed: { label: "مكتمل", tone: "info" },
  refunded: { label: "مسترجع", tone: "danger" },
};

/** رقم الحجز بصيغة KS-000123 */
export function formatBookingId(n: number): string {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError("booking number must be a non-negative integer");
  }
  return `KS-${String(n).padStart(6, "0")}`;
}
