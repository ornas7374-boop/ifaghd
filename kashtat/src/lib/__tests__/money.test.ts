import { describe, expect, it } from "vitest";
import { formatSar } from "../money";

describe("formatSar", () => {
  it("converts halalas to riyals", () => {
    expect(formatSar(80000)).toBe("800 ر.س");
    expect(formatSar(15050)).toBe("150.5 ر.س");
    expect(formatSar(320000)).toBe("3,200 ر.س");
  });
});
