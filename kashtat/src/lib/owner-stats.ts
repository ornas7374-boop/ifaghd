// أرقام لوحة المالك: تُحسب من حجوزات العملاء فقط (بدون الحظر والملغاة)
export type HostBookingLite = {
  status: string;
  source: string;
  start: string;
  total: number;
  commission: number;
};

export function monthStats(bookings: HostBookingLite[], now = new Date()) {
  const key = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
    }).format(d);
  const month = key(now);
  const counted = bookings.filter(
    (b) => b.source === "customer" && b.status !== "cancelled" && key(new Date(b.start)) === month,
  );
  const gross = counted.reduce((s, b) => s + b.total, 0);
  const commission = counted.reduce((s, b) => s + b.commission, 0);
  return { count: counted.length, gross, commission, net: gross - commission };
}
