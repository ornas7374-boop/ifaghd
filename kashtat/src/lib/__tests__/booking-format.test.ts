import { describe, expect, it } from "vitest";
import { formatBookingRange, isUpcoming } from "../booking-format";

describe("formatBookingRange", () => {
  it("shows Riyadh times for a same-day booking", () => {
    // 13:00Z = 4:00 م بتوقيت الرياض
    const s = formatBookingRange("2030-03-10T13:00:00Z", "2030-03-10T17:00:00Z");
    expect(s).toContain("4:00");
    expect(s).toContain("8:00");
    expect(s).not.toContain("←");
  });

  it("uses an arrow for multi-day bookings", () => {
    expect(formatBookingRange("2030-03-10T13:00:00Z", "2030-03-12T09:00:00Z")).toContain("←");
  });
});

describe("isUpcoming", () => {
  it("compares with now", () => {
    const now = new Date("2030-01-01T00:00:00Z");
    expect(isUpcoming("2030-01-02T00:00:00Z", now)).toBe(true);
    expect(isUpcoming("2029-12-31T00:00:00Z", now)).toBe(false);
  });
});
