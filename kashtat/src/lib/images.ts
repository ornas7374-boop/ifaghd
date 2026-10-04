// مسار الصورة: يبدأ بـ "/" = ملف داخل الموقع (public)، وغير ذلك = ملف في Supabase Storage
export type ImageRow = {
  storage_path: string;
  alt_ar: string | null;
  is_cover: boolean;
  sort_order: number;
};
export type PlaceImage = { src: string; alt: string };

export function imageUrl(path: string): string {
  if (path.startsWith("/")) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/listings/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** الغلاف أولًا ثم حسب الترتيب */
export function toImages(rows: ImageRow[] | null | undefined, fallbackAlt: string): PlaceImage[] {
  return [...(rows ?? [])]
    .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order)
    .map((r) => ({ src: imageUrl(r.storage_path), alt: r.alt_ar ?? fallbackAlt }));
}

// مجموعة الصور الجاهزة: تُعطى عشوائيًا للأماكن الجديدة (نسخة تدريبية بدون رفع صور)
export const IMAGE_POOL = [
  "demo-royal-camp",
  "demo-shafa-camp",
  "demo-golden-sands",
  "demo-palm-kashta",
  "demo-soudah-view",
  "demo-abhur-beach",
  "demo-thumamah",
  "demo-tabuk-north",
  "demo-halfmoon-beach",
  "demo-red-nafud-camp",
  "demo-aridh-evening",
  "demo-habala-camp",
];

export function randomImageSet(rand: () => number = Math.random): string[] {
  const slug = IMAGE_POOL[Math.floor(rand() * IMAGE_POOL.length)];
  return [1, 2, 3].map((n) => `/places/${slug}-${n}.jpg`);
}
