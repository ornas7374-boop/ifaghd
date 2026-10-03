import "server-only";
import { createPublicClient } from "@/lib/supabase/public";

export type RateUnit = "hour" | "day" | "night";
export type PlaceKind = "kashta" | "camp" | "wild";

export const RATE_UNIT_LABEL: Record<RateUnit, string> = {
  hour: "الساعة",
  day: "اليوم",
  night: "الليلة",
};

export const PLACE_KIND_LABEL: Record<PlaceKind, string> = {
  kashta: "كشتة",
  camp: "مخيم",
  wild: "موقع بري",
};

export type PlaceCard = {
  slug: string;
  title: string;
  kind: PlaceKind;
  city: string;
  capacityMax: number;
  rating: number;
  ratingCount: number;
  amenities: string[];
  /** أقل وحدة سعر متاحة للعرض في البطاقة */
  price: { amount: number; unit: RateUnit } | null;
};

type PriceFields = {
  price_per_hour: number | null;
  price_per_day: number | null;
  price_per_night: number | null;
};

/** الساعة أولًا ثم اليوم ثم الليلة: يعرض أصغر التزام ممكن */
export function startingPrice(p: PriceFields): PlaceCard["price"] {
  if (p.price_per_hour != null) return { amount: p.price_per_hour, unit: "hour" };
  if (p.price_per_day != null) return { amount: p.price_per_day, unit: "day" };
  if (p.price_per_night != null) return { amount: p.price_per_night, unit: "night" };
  return null;
}

type PlaceRow = PriceFields & {
  slug: string;
  title_ar: string;
  place_kind: PlaceKind;
  capacity_max: number;
  rating_avg: number | string;
  rating_count: number;
  cities: { name_ar: string } | null;
  place_amenities: Array<{ amenities: { name_ar: string } | null }>;
};

const CARD_COLUMNS =
  "slug, title_ar, place_kind, capacity_max, rating_avg, rating_count, price_per_hour, price_per_day, price_per_night, cities(name_ar), place_amenities(amenities(name_ar))";

function toCard(r: PlaceRow): PlaceCard {
  return {
    slug: r.slug,
    title: r.title_ar,
    kind: r.place_kind,
    city: r.cities?.name_ar ?? "",
    capacityMax: r.capacity_max,
    rating: Number(r.rating_avg),
    ratingCount: r.rating_count,
    amenities: r.place_amenities.flatMap((pa) => (pa.amenities ? [pa.amenities.name_ar] : [])),
    price: startingPrice(r),
  };
}

/** أعلى الأماكن المنشورة تقييمًا */
export async function getFeaturedPlaces(limit = 4): Promise<PlaceCard[]> {
  const { data, error } = await createPublicClient()
    .from("places")
    .select(CARD_COLUMNS)
    .eq("status", "published")
    .order("rating_avg", { ascending: false })
    .order("rating_count", { ascending: false })
    .limit(limit)
    .returns<PlaceRow[]>();
  if (error) throw new Error(`getFeaturedPlaces: ${error.message}`);
  return data.map(toCard);
}
