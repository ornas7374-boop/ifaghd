import { describe, expect, it } from "vitest";
import { monthStats } from "../owner-stats";

describe("monthStats", () => {
  const now = new Date("2026-10-15T12:00:00Z");
  const b = (o: Partial<Parameters<typeof monthStats>[0][number]>) => ({
    status: "confirmed",
    source: "customer",
    start: "2026-10-10T13:00:00Z",
    total: 50000,
    commission: 5000,
    ...o,
  });

  it("counts this month's customer bookings only", () => {
    const s = monthStats(
      [
        b({}),
        b({ total: 30000, commission: 3000 }),
        b({ status: "cancelled" }),
        b({ source: "host_block", total: 0, commission: 0 }),
        b({ start: "2026-09-30T13:00:00Z" }),
      ],
      now,
    );
    expect(s).toEqual({ count: 2, gross: 80000, commission: 8000, net: 72000 });
  });

  it("uses Riyadh time at the month boundary", () => {
    // 22:00Z في 31 أكتوبر = 1 نوفمبر بتوقيت الرياض
    const s = monthStats([b({ start: "2026-10-31T22:00:00Z" })], now);
    expect(s.count).toBe(0);
  });
});
