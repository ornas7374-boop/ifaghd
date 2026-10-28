import { describe, expect, it } from "vitest";
import { cityHeading, cityLinkLabel } from "../city-content";
const PLACE_KINDS = ["kashta", "camp", "wild"];
import { TYPE_LIST, TYPE_PAGES } from "../type-content";

describe("صفحات الأنواع", () => {
  it("صفحة لكل نوع برابط فريد", () => {
    expect(Object.keys(TYPE_PAGES).sort()).toEqual([...PLACE_KINDS].sort());
    expect(new Set(TYPE_LIST.map((t) => t.path)).size).toBe(TYPE_LIST.length);
  });

  it("العنوان والوصف بطول مناسب لنتائج جوجل", () => {
    for (const t of TYPE_LIST) {
      // العنوان يُضاف له « | الكشتات» من القالب
      expect(`${t.title} | الكشتات`.length).toBeLessThanOrEqual(60);
      expect(t.description.length).toBeGreaterThanOrEqual(110);
      expect(t.description.length).toBeLessThanOrEqual(160);
      expect(t.faq.length).toBeGreaterThan(0);
    }
  });
});

describe("كلمة المدينة", () => {
  it("المخيمات أولًا حيث يبحث الناس عنها", () => {
    expect(cityHeading("riyadh", "الرياض")).toBe("مخيمات وكشتات الرياض");
    expect(cityHeading("jeddah", "جدة")).toBe("كشتات ومخيمات جدة");
    expect(cityLinkLabel("dammam", "الدمام")).toBe("مخيمات الدمام");
    expect(cityLinkLabel("abha", "أبها")).toBe("كشتات أبها");
  });
});
