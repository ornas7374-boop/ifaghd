import { describe, expect, it } from "vitest";
import { getGuide, GUIDES } from "../guides";
import { TYPE_LIST } from "../type-content";

describe("الأدلة", () => {
  it("روابط فريدة وكل دليل مربوط من صفحة نوع موجود", () => {
    expect(new Set(GUIDES.map((g) => g.slug)).size).toBe(GUIDES.length);
    for (const t of TYPE_LIST) if (t.guide) expect(getGuide(t.guide)).toBeDefined();
  });

  it("العنوان والوصف بطول مناسب لنتائج جوجل", () => {
    for (const g of GUIDES) {
      expect(`${g.metaTitle} | الكشتات`.length).toBeLessThanOrEqual(60);
      expect(g.description.length).toBeGreaterThanOrEqual(110);
      expect(g.description.length).toBeLessThanOrEqual(160);
    }
  });

  it("أقسام بمعرّفات فريدة لروابط المحتويات", () => {
    for (const g of GUIDES) {
      const ids = g.sections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
