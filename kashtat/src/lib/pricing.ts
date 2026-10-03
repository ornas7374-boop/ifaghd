// نسخة مطابقة لدالتي pricing_multiplier و create_booking في قاعدة البيانات.
// للعرض فقط: السعر النهائي تحسبه القاعدة عند إنشاء الحجز.

export type RateUnit = "hour" | "day" | "night";
export type PricingMode =
  | "fixed"
  | "per_booking"
  | "per_hour"
  | "per_day"
  | "per_night"
  | "per_person"
  | "per_unit"
  | "per_km";

export const PRICING_MODE_LABEL: Record<PricingMode, string> = {
  fixed: "مرة واحدة",
  per_booking: "للحجز",
  per_hour: "للساعة",
  per_day: "لليوم",
  per_night: "لليلة",
  per_person: "للشخص",
  per_unit: "للقطعة",
  per_km: "للكيلو",
};

type Counts = { hours: number; days: number; nights: number; persons: number };

export function pricingMultiplier(
  mode: PricingMode,
  c: Counts,
  quantity = 1,
  distance = 0,
): number {
  const q = Math.max(1, quantity);
  switch (mode) {
    case "fixed":
      return 1;
    case "per_booking":
      return q;
    case "per_hour":
      return Math.max(1, c.hours) * q;
    case "per_day":
      return Math.max(1, c.days) * q;
    case "per_night":
      return Math.max(1, c.nights) * q;
    case "per_person":
      return Math.max(1, c.persons) * q;
    case "per_unit":
      return q;
    case "per_km":
      return Math.max(0, distance) * q;
  }
}

export type Rates = { hour: number | null; day: number | null; night: number | null };
export type AddonPrice = { id: string; name: string; price: number; mode: PricingMode };

export type Quote = {
  rate: number;
  base: number;
  addons: Array<{ id: string; name: string; amount: number }>;
  addonsTotal: number;
  total: number;
};

/** المبالغ بالهللة، والتقريب مثل round في Postgres */
export function quote(input: {
  rates: Rates;
  unit: RateUnit;
  duration: number;
  guests: number;
  addons: AddonPrice[];
}): Quote | null {
  const rate = input.rates[input.unit];
  if (rate == null || input.duration < 1) return null;
  const c: Counts = {
    hours: input.unit === "hour" ? input.duration : 0,
    days: input.unit === "day" ? input.duration : 0,
    nights: input.unit === "night" ? input.duration : 0,
    persons: input.guests,
  };
  const baseMode: PricingMode =
    input.unit === "hour" ? "per_hour" : input.unit === "day" ? "per_day" : "per_night";
  const base = Math.round(rate * pricingMultiplier(baseMode, c));
  const addons = input.addons.map((a) => ({
    id: a.id,
    name: a.name,
    amount: Math.round(a.price * pricingMultiplier(a.mode, c)),
  }));
  const addonsTotal = addons.reduce((s, a) => s + a.amount, 0);
  return { rate, base, addons, addonsTotal, total: Math.max(0, base + addonsTotal) };
}
