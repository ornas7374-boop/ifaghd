import { describe, expect, it } from "vitest";
import { imageUrl, randomImageSet, toImages } from "../images";

describe("images", () => {
  it("keeps local paths and builds storage urls", () => {
    expect(imageUrl("/places/a-1.jpg")).toBe("/places/a-1.jpg");
    expect(imageUrl("host/x y.jpg")).toMatch(
      /\/storage\/v1\/object\/public\/listings\/host\/x%20y\.jpg$/,
    );
  });

  it("puts the cover first", () => {
    const imgs = toImages(
      [
        { storage_path: "/b.jpg", alt_ar: null, is_cover: false, sort_order: 1 },
        { storage_path: "/a.jpg", alt_ar: "غلاف", is_cover: true, sort_order: 2 },
      ],
      "مكان",
    );
    expect(imgs.map((i) => i.src)).toEqual(["/a.jpg", "/b.jpg"]);
    expect(imgs[1].alt).toBe("مكان");
  });

  it("picks a full set of three from the pool", () => {
    expect(randomImageSet(() => 0)).toEqual([
      "/places/demo-royal-camp-1.jpg",
      "/places/demo-royal-camp-2.jpg",
      "/places/demo-royal-camp-3.jpg",
    ]);
  });
});
