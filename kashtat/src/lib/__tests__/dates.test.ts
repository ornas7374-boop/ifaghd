import { describe, expect, it } from "vitest";
import { addMonths, fromDateKey, isSameDay, monthGrid, toDateKey } from "../dates";
import { formatBookingId } from "../booking-status";

describe("monthGrid", () => {
  it("returns 6 full weeks starting on Sunday", () => {
    const grid = monthGrid(new Date(2026, 9, 1)); // أكتوبر 2026 يبدأ الخميس
    expect(grid).toHaveLength(42);
    expect(grid[0].date.getDay()).toBe(0);
    expect(toDateKey(grid[0].date)).toBe("2026-09-27");
    expect(grid[4]).toMatchObject({ inMonth: true });
    expect(grid[4].date.getDate()).toBe(1);
  });

  it("marks days outside the month", () => {
    const grid = monthGrid(new Date(2026, 1, 1)); // فبراير 2026 يبدأ الأحد
    const inMonth = grid.filter((d) => d.inMonth);
    expect(inMonth).toHaveLength(28);
    expect(grid[0].inMonth).toBe(true);
    expect(grid[41].inMonth).toBe(false);
  });
});

describe("addMonths", () => {
  it("does not skip a month from the 31st", () => {
    const d = addMonths(new Date(2026, 0, 31), 1);
    expect(d.getMonth()).toBe(1);
  });
});

describe("date keys", () => {
  it("round-trips", () => {
    const d = new Date(2026, 11, 5);
    expect(toDateKey(d)).toBe("2026-12-05");
    expect(isSameDay(fromDateKey("2026-12-05")!, d)).toBe(true);
  });

  it("rejects invalid dates", () => {
    expect(fromDateKey("2026-02-30")).toBeNull();
    expect(fromDateKey("05/12/2026")).toBeNull();
  });
});

describe("formatBookingId", () => {
  it("pads to six digits", () => {
    expect(formatBookingId(482)).toBe("KS-000482");
    expect(formatBookingId(1234567)).toBe("KS-1234567");
  });

  it("rejects invalid numbers", () => {
    expect(() => formatBookingId(-1)).toThrow();
    expect(() => formatBookingId(1.5)).toThrow();
  });
});

import { addHoursToTime, formatTime12 } from "../dates";

describe("time helpers", () => {
  it("formats 12-hour Arabic time", () => {
    expect(formatTime12("16:00")).toBe("4:00 م");
    expect(formatTime12("00:30")).toBe("12:30 ص");
    expect(formatTime12("12:00")).toBe("12:00 م");
  });

  it("adds hours across midnight", () => {
    expect(addHoursToTime("20:00", 6)).toBe("02:00");
  });
});
