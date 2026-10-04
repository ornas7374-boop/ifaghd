import { describe, expect, it } from "vitest";
import { bookingErrorMessage } from "../booking-errors";
import { describeWindow } from "../booking-window";

describe("describeWindow", () => {
  const base = { date: new Date(2026, 9, 9), checkIn: "16:00", checkOut: "12:00" };

  it("describes hourly bookings", () => {
    expect(describeWindow({ ...base, unit: "hour", duration: 4, from: "18:00" })).toContain(
      "6:00 م – 10:00 م",
    );
  });

  it("describes nights with check-out on the last day", () => {
    const s = describeWindow({ ...base, unit: "night", duration: 2 });
    expect(s).toContain("دخول");
    expect(s).toContain("4:00 م");
    expect(s).toContain("12:00 م");
  });
});

describe("bookingErrorMessage", () => {
  it("maps database errors to Arabic", () => {
    expect(bookingErrorMessage("ERROR: SLOT_TAKEN")).toBe("الوقت محجوز مسبقًا، اختر وقتًا آخر");
    expect(bookingErrorMessage("something else")).toBe("صار خطأ غير متوقع، حاول مرة ثانية");
  });
});
