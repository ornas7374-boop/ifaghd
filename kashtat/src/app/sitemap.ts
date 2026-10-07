import type { MetadataRoute } from "next";
import { getSitemapPlaces } from "@/lib/db/places";
import { absoluteUrl } from "@/lib/site";

// تُعاد بناؤها كل ساعة لتشمل الأماكن المعتمدة حديثًا
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/places"), changeFrequency: "daily", priority: 0.9 },
  ];

  let places: Awaited<ReturnType<typeof getSitemapPlaces>> = [];
  try {
    places = await getSitemapPlaces();
  } catch (err) {
    console.error(err);
    return base;
  }

  // صفحة لكل مدينة فيها أماكن منشورة، وآخر تعديل = أحدث مكان فيها
  const cities = new Map<string, string>();
  for (const p of places) {
    if (!p.citySlug) continue;
    const prev = cities.get(p.citySlug);
    if (!prev || p.updatedAt > prev) cities.set(p.citySlug, p.updatedAt);
  }

  return [
    ...base,
    ...[...cities].map(([slug, updated]) => ({
      url: absoluteUrl(`/cities/${slug}`),
      lastModified: new Date(updated),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...places.map((p) => ({
      url: absoluteUrl(`/places/${p.slug}`),
      lastModified: new Date(p.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
