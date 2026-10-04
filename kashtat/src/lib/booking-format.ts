// عرض أوقات الحجز بتوقيت الرياض بغض النظر عن منطقة الخادم أو الجهاز
const TZ = "Asia/Riyadh";
const LOCALE = "ar-SA-u-ca-gregory-nu-latn";

const dateFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TZ,
  hour: "numeric",
  minute: "2-digit",
});
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, dateStyle: "short" });

export function formatBookingRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (dayKey.format(s) === dayKey.format(e)) {
    return `${dateFmt.format(s)} · ${timeFmt.format(s)} – ${timeFmt.format(e)}`;
  }
  return `${dateFmt.format(s)} ${timeFmt.format(s)} ← ${dateFmt.format(e)} ${timeFmt.format(e)}`;
}

export function isUpcoming(startIso: string, now = new Date()): boolean {
  return new Date(startIso) > now;
}
