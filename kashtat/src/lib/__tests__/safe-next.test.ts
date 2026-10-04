import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServer: vi.fn() }));

const { safeNext } = await import("../auth");

describe("safeNext", () => {
  it("keeps internal paths", () => {
    expect(safeNext("/bookings")).toBe("/bookings");
    expect(safeNext("/places/x/book?type=night")).toBe("/places/x/book?type=night");
  });

  it("rejects external or malformed targets", () => {
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext(undefined, "/bookings")).toBe("/bookings");
  });
});
