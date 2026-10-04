import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import { toImages, type ImageRow, type PlaceImage } from "@/lib/images";
import type { PricingMode, RateUnit } from "@/lib/pricing";

export type { RateUnit };
export type PlaceKind = "kashta" | "camp" | "wild";
export const PLACE_KINDS: PlaceKind[] = ["kashta", "camp", "wild"];
export const RATE_UNITS: RateUnit[] = ["hour", "day", "night"];

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
  cover: PlaceImage | null;
};

type PriceFields = {
  price_per_hour: number | null;
  price_per_day: number | null;
  price_per_night: number | null;
};

/** الساعة أولًا ثم اليوم ثم الليلة: يعرض أصغر التزام ممكن */
export function startingPrice(p: PriceFields, prefer?: RateUnit): PlaceCard["price"] {
  const col = { hour: p.price_per_hour, day: p.price_per_day, night: p.price_per_night };
  if (prefer && col[prefer] != null) return { amount: col[prefer]!, unit: prefer };
  for (const unit of RATE_UNITS) {
    if (col[unit] != null) return { amount: col[unit]!, unit };
  }
  return null;
}

type PlaceRow = PriceFields & {
  slug: string;
  title_ar: string;
  place_kind: PlaceKind;
  capacity_min: number;
  capacity_max: number;
  rating_avg: number | string;
  rating_count: number;
  cities: { slug: string; name_ar: string } | null;
  place_amenities: Array<{ amenities: { slug: string; name_ar: string } | null }>;
  listing_images: ImageRow[];
};

const CARD_COLUMNS =
  "slug, title_ar, place_kind, capacity_min, capacity_max, rating_avg, rating_count, price_per_hour, price_per_day, price_per_night, cities(slug, name_ar), place_amenities(amenities(slug, name_ar)), listing_images(storage_path, alt_ar, is_cover, sort_order)";

function toCard(r: PlaceRow, prefer?: RateUnit): PlaceCard {
  return {
    slug: r.slug,
    title: r.title_ar,
    kind: r.place_kind,
    city: r.cities?.name_ar ?? "",
    capacityMax: r.capacity_max,
    rating: Number(r.rating_avg),
    ratingCount: r.rating_count,
    amenities: r.place_amenities.flatMap((pa) => (pa.amenities ? [pa.amenities.name_ar] : [])),
    price: startingPrice(r, prefer),
    cover: toImages(r.listing_images, r.title_ar)[0] ?? null,
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
  return data.map((r) => toCard(r));
}

/* ---------- البحث ---------- */

export type Option = { slug: string; name: string };

export async function getCities(): Promise<Option[]> {
  const { data, error } = await createPublicClient()
    .from("cities")
    .select("slug, name_ar")
    .order("name_ar");
  if (error) throw new Error(`getCities: ${error.message}`);
  return data.map((c) => ({ slug: c.slug, name: c.name_ar }));
}

export async function getAmenities(): Promise<Option[]> {
  const { data, error } = await createPublicClient()
    .from("amenities")
    .select("slug, name_ar")
    .order("name_ar");
  if (error) throw new Error(`getAmenities: ${error.message}`);
  return data.map((a) => ({ slug: a.slug, name: a.name_ar }));
}

export type SortKey = "rating" | "price_asc" | "price_desc";

export type PlaceFilters = {
  q?: string;
  city?: string;
  kind?: PlaceKind;
  unit?: RateUnit;
  guests?: number;
  /** أعلى سعر بالهللة للوحدة المختارة (أو أقل وحدة متاحة) */
  maxPrice?: number;
  amenities?: string[];
  sort?: SortKey;
};

// يحذف الرموز التي لها معنى في فلاتر PostgREST
function cleanTerm(s: string) {
  return s
    .replace(/[%,()*\\."']/g, " ")
    .trim()
    .slice(0, 60);
}

export async function searchPlaces(f: PlaceFilters): Promise<PlaceCard[]> {
  const db = createPublicClient();
  let query = db.from("places").select(CARD_COLUMNS).eq("status", "published");

  if (f.kind) query = query.eq("place_kind", f.kind);
  if (f.unit) query = query.not(`price_per_${f.unit}`, "is", null);
  if (f.guests) query = query.lte("capacity_min", f.guests).gte("capacity_max", f.guests);

  if (f.city) {
    const { data: city } = await db.from("cities").select("id").eq("slug", f.city).maybeSingle();
    if (!city) return [];
    query = query.eq("city_id", city.id);
  }

  const term = f.q ? cleanTerm(f.q) : "";
  if (term) {
    // النص يطابق اسم المكان أو اسم المدينة
    const { data: cities } = await db.from("cities").select("id").ilike("name_ar", `%${term}%`);
    const ids = (cities ?? []).map((c) => c.id);
    query = query.or(
      [`title_ar.ilike.%${term}%`, `address_text.ilike.%${term}%`]
        .concat(ids.length ? [`city_id.in.(${ids.join(",")})`] : [])
        .join(","),
    );
  }

  const { data, error } = await query
    .order("rating_avg", { ascending: false })
    .limit(60)
    .returns<PlaceRow[]>();
  if (error) throw new Error(`searchPlaces: ${error.message}`);

  let rows = data;
  if (f.amenities?.length) {
    // يجب أن يحتوي المكان على كل المرافق المختارة
    rows = rows.filter((r) => {
      const has = new Set(r.place_amenities.map((pa) => pa.amenities?.slug));
      return f.amenities!.every((a) => has.has(a));
    });
  }

  let cards = rows.map((r) => toCard(r, f.unit));
  if (f.maxPrice) cards = cards.filter((c) => c.price && c.price.amount <= f.maxPrice!);
  if (f.sort === "price_asc" || f.sort === "price_desc") {
    const dir = f.sort === "price_asc" ? 1 : -1;
    cards.sort((a, b) => dir * ((a.price?.amount ?? Infinity) - (b.price?.amount ?? Infinity)));
  }
  return cards;
}

/* ---------- صفحة المكان ---------- */

export type PlaceDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: PlaceKind;
  city: Option;
  address: string;
  /** موقع تقريبي (~1 كم): الموقع الدقيق يظهر بعد الحجز */
  approx: { lat: number; lng: number };
  capacityMin: number;
  capacityMax: number;
  checkIn: string;
  checkOut: string;
  turnaroundMinutes: number;
  rates: { hour: number | null; day: number | null; night: number | null };
  rating: number;
  ratingCount: number;
  cancellationPolicy: string;
  rules: string | null;
  amenities: Option[];
  addons: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    mode: PricingMode;
  }>;
  reviews: Array<{ id: string; rating: number; body: string; createdAt: string }>;
  images: PlaceImage[];
};

type DetailRow = PriceFields & {
  id: string;
  slug: string;
  title_ar: string;
  description_ar: string;
  place_kind: PlaceKind;
  address_text: string;
  latitude: number;
  longitude: number;
  capacity_min: number;
  capacity_max: number;
  check_in_time: string;
  check_out_time: string;
  turnaround_minutes: number;
  rating_avg: number | string;
  rating_count: number;
  cancellation_policy_ar: string;
  rules_ar: string | null;
  cities: { slug: string; name_ar: string } | null;
  place_amenities: Array<{ amenities: { slug: string; name_ar: string } | null }>;
  listing_images: ImageRow[];
  addons: Array<{
    id: string;
    name_ar: string;
    description_ar: string | null;
    price: number;
    pricing_mode: PricingMode;
    is_active: boolean;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    body_ar: string;
    created_at: string;
    is_hidden: boolean;
  }>;
};

export async function getPlaceBySlug(slug: string): Promise<PlaceDetail | null> {
  const { data, error } = await createPublicClient()
    .from("places")
    .select(
      "id, slug, title_ar, description_ar, place_kind, address_text, latitude, longitude, capacity_min, capacity_max, check_in_time, check_out_time, turnaround_minutes, price_per_hour, price_per_day, price_per_night, rating_avg, rating_count, cancellation_policy_ar, rules_ar, cities(slug, name_ar), place_amenities(amenities(slug, name_ar)), addons(id, name_ar, description_ar, price, pricing_mode, is_active), reviews(id, rating, body_ar, created_at, is_hidden), listing_images(storage_path, alt_ar, is_cover, sort_order)",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle<DetailRow>();
  if (error) throw new Error(`getPlaceBySlug: ${error.message}`);
  if (!data) return null;

  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    id: data.id,
    slug: data.slug,
    title: data.title_ar,
    description: data.description_ar,
    kind: data.place_kind,
    city: { slug: data.cities?.slug ?? "", name: data.cities?.name_ar ?? "" },
    address: data.address_text,
    approx: { lat: round2(data.latitude), lng: round2(data.longitude) },
    capacityMin: data.capacity_min,
    capacityMax: data.capacity_max,
    checkIn: data.check_in_time.slice(0, 5),
    checkOut: data.check_out_time.slice(0, 5),
    turnaroundMinutes: data.turnaround_minutes,
    rates: { hour: data.price_per_hour, day: data.price_per_day, night: data.price_per_night },
    rating: Number(data.rating_avg),
    ratingCount: data.rating_count,
    cancellationPolicy: data.cancellation_policy_ar,
    rules: data.rules_ar,
    amenities: data.place_amenities.flatMap((pa) =>
      pa.amenities ? [{ slug: pa.amenities.slug, name: pa.amenities.name_ar }] : [],
    ),
    addons: data.addons
      .filter((a) => a.is_active)
      .map((a) => ({
        id: a.id,
        name: a.name_ar,
        description: a.description_ar,
        price: a.price,
        mode: a.pricing_mode,
      })),
    images: toImages(data.listing_images, data.title_ar),
    reviews: data.reviews
      .filter((r) => !r.is_hidden)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((r) => ({ id: r.id, rating: r.rating, body: r.body_ar, createdAt: r.created_at })),
  };
}
