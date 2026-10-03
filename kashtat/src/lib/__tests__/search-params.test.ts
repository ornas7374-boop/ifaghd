import { describe, expect, it } from "vitest";
import { bookingQuery, parseSearchParams } from "../search-params";

describe("parseSearchParams", () => {
  it("parses valid values", () => {
    const p = parseSearchParams({
      q: " الرياض ",
      kind: "camp",
      type: "night",
      guests: "6",
      maxPrice: "500",
      amenity: ["wifi", "pool"],
      date: "2026-10-09",
      from: "16:00",
    });
    expect(p).toMatchObject({
      q: "الرياض",
      kind: "camp",
      type: "night",
      guests: 6,
      maxPrice: 500,
      amenities: ["wifi", "pool"],
      date: "2026-10-09",
      from: "16:00",
    });
  });

  it("drops invalid values instead of failing", () => {
    const p = parseSearchParams({
      kind: "castle",
      guests: "-3",
      from: "16:30",
      city: "Riyadh!",
      amenity: "<script>",
      q: "",
    });
    expect(p).toEqual({ amenities: [] });
  });
});

describe("bookingQuery", () => {
  it("keeps only booking fields", () => {
    expect(bookingQuery({ type: "hour", date: "2026-10-09", from: "16:00", guests: 4 })).toBe(
      "?type=hour&date=2026-10-09&from=16%3A00&guests=4",
    );
    expect(bookingQuery({})).toBe("");
  });
});
