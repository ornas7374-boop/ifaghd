import { z } from "zod";

export type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const all = (v: string | string[] | undefined) =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

// القيم غير الصالحة تُتجاهل بدل أن تُفشل الصفحة
const opt = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

const schema = z.object({
  q: opt(z.string().trim().min(1).max(60)),
  city: opt(z.string().regex(/^[a-z0-9-]{1,40}$/)),
  kind: opt(z.enum(["kashta", "camp", "wild"])),
  type: opt(z.enum(["hour", "day", "night"])),
  guests: opt(z.coerce.number().int().min(1).max(500)),
  maxPrice: opt(z.coerce.number().int().min(1).max(1_000_000)),
  sort: opt(z.enum(["rating", "price_asc", "price_desc"])),
  date: opt(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  from: opt(z.string().regex(/^([01]\d|2[0-3]):00$/)),
  duration: opt(z.coerce.number().int().min(1).max(30)),
});

export type SearchParams = z.infer<typeof schema> & { amenities: string[] };

export function parseSearchParams(raw: RawParams): SearchParams {
  const parsed = schema.parse(
    Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, first(v)])),
  );
  const amenities = all(raw.amenity)
    .filter((a) => /^[a-z0-9-]{1,40}$/.test(a))
    .slice(0, 12);
  return { ...parsed, amenities };
}

/** معاملات الحجز التي تنتقل من البحث إلى صفحة المكان */
export function bookingQuery(
  p: Pick<SearchParams, "type" | "date" | "from" | "duration" | "guests">,
) {
  const qs = new URLSearchParams();
  if (p.type) qs.set("type", p.type);
  if (p.date) qs.set("date", p.date);
  if (p.from) qs.set("from", p.from);
  if (p.duration) qs.set("duration", String(p.duration));
  if (p.guests) qs.set("guests", String(p.guests));
  const s = qs.toString();
  return s ? `?${s}` : "";
}
