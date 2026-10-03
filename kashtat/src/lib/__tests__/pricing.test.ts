import { describe, expect, it } from "vitest";
import { pricingMultiplier, quote } from "../pricing";

const counts = { hours: 4, days: 0, nights: 0, persons: 6 };

describe("pricingMultiplier", () => {
  it("matches the database function", () => {
    expect(pricingMultiplier("fixed", counts)).toBe(1);
    expect(pricingMultiplier("per_booking", counts)).toBe(1);
    expect(pricingMultiplier("per_hour", counts)).toBe(4);
    expect(pricingMultiplier("per_day", counts)).toBe(1); // الحد الأدنى 1
    expect(pricingMultiplier("per_person", counts)).toBe(6);
    expect(pricingMultiplier("per_km", counts)).toBe(0);
  });
});

describe("quote", () => {
  const rates = { hour: null, day: 80000, night: 120000 };

  it("prices nights with per-person and per-booking addons", () => {
    const q = quote({
      rates,
      unit: "night",
      duration: 2,
      guests: 10,
      addons: [
        { id: "a", name: "ضيافة للشخص", price: 2500, mode: "per_person" },
        { id: "b", name: "مشب", price: 12000, mode: "per_booking" },
      ],
    });
    expect(q).toMatchObject({ base: 240000, addonsTotal: 37000, total: 277000 });
  });

  it("returns null for an unavailable unit", () => {
    expect(quote({ rates, unit: "hour", duration: 3, guests: 4, addons: [] })).toBeNull();
  });

  it("returns null for an invalid duration", () => {
    expect(quote({ rates, unit: "day", duration: 0, guests: 4, addons: [] })).toBeNull();
  });
});
