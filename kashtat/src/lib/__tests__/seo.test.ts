import { describe, expect, it } from "vitest";
import { placesCount } from "../plural";
import { clip, pageMeta } from "../seo";
import { absoluteUrl } from "../site";

describe("clip", () => {
  it("يبقي النص القصير كما هو", () => {
    expect(clip("  كشتة   في الرياض ")).toBe("كشتة في الرياض");
  });
  it("يقص على حدود كلمة ويضيف نقاط", () => {
    const long = "كلمة ".repeat(60);
    const out = clip(long, 100);
    expect(out.length).toBeLessThanOrEqual(101);
    expect(out.endsWith("كلمة…")).toBe(true);
  });
});

describe("pageMeta", () => {
  it("يضع canonical ويحافظ على بيانات المشاركة الأساسية", () => {
    const m = pageMeta({ title: "ع", description: "و", path: "/cities/riyadh" });
    expect(m.alternates?.canonical).toBe("/cities/riyadh");
    expect(m.openGraph).toMatchObject({
      locale: "ar_SA",
      siteName: "الكشتات",
      url: "/cities/riyadh",
    });
  });
});

describe("absoluteUrl", () => {
  it("يبني رابطًا مطلقًا ويترك الروابط المطلقة", () => {
    expect(absoluteUrl("/places")).toMatch(/^https?:\/\/[^/]+\/places$/);
    expect(absoluteUrl("https://x.test/a.jpg")).toBe("https://x.test/a.jpg");
  });
});

describe("placesCount", () => {
  it("صيغ العدد", () => {
    expect([0, 1, 2, 5, 12].map(placesCount)).toEqual([
      "لا توجد نتائج",
      "مكان واحد",
      "مكانان",
      "5 أماكن",
      "12 مكانًا",
    ]);
  });
});
