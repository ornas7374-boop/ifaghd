import type { Metadata } from "next";
import Link from "next/link";
import { PlaceCard } from "@/components/places/place-card";
import { SearchFilters } from "@/components/places/search-filters";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  getAmenities,
  getCities,
  searchPlaces,
  type Option,
  type PlaceCard as PlaceCardData,
  type SortKey,
} from "@/lib/db/places";
import { bookingQuery, parseSearchParams, type RawParams } from "@/lib/search-params";
import { pageMeta } from "@/lib/seo";
import { placesCount } from "@/lib/plural";

export async function generateMetadata(props: PageProps<"/places">): Promise<Metadata> {
  const raw = (await props.searchParams) as RawParams;
  const keys = Object.keys(raw).filter((k) => raw[k] !== undefined && raw[k] !== "");
  const base = pageMeta({
    title: "ابحث عن كشتات ومخيمات في السعودية",
    description:
      "تصفح كل الكشتات والمخيمات والمواقع البرية المتاحة في السعودية، وفلتر حسب المدينة والسعر والمرافق، واحجز بالساعة أو اليوم أو الليلة.",
    path: "/places",
  });
  // نتائج الفلاتر نسخ مكررة من نفس الصفحة: لا تُفهرس لكن روابطها تُتبع
  if (keys.length === 0) return base;
  const city = typeof raw.city === "string" && keys.length === 1 ? raw.city : null;
  return {
    ...base,
    robots: { index: false, follow: true },
    alternates: { canonical: city ? `/cities/${city}` : "/places" },
  };
}

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "rating", label: "الأعلى تقييمًا" },
  { key: "price_asc", label: "الأقل سعرًا" },
  { key: "price_desc", label: "الأعلى سعرًا" },
];

function sortHref(raw: RawParams, key: SortKey) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    if (k === "sort" || v === undefined) continue;
    for (const item of Array.isArray(v) ? v : [v]) qs.append(k, item);
  }
  if (key !== "rating") qs.set("sort", key);
  const s = qs.toString();
  return s ? `/places?${s}` : "/places";
}

type Loaded = { places: PlaceCardData[]; cities: Option[]; amenities: Option[] } | null;

export default async function PlacesPage(props: PageProps<"/places">) {
  const raw = (await props.searchParams) as RawParams;
  const params = parseSearchParams(raw);

  let data: Loaded = null;
  try {
    const [places, cities, amenities] = await Promise.all([
      searchPlaces({
        q: params.q,
        city: params.city,
        kind: params.kind,
        unit: params.type,
        guests: params.guests,
        maxPrice: params.maxPrice ? params.maxPrice * 100 : undefined,
        amenities: params.amenities,
        sort: params.sort,
      }),
      getCities(),
      getAmenities(),
    ]);
    data = { places, cities, amenities };
  } catch (err) {
    console.error(err);
  }

  const query = bookingQuery(params);
  const activeSort = params.sort ?? "rating";

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[1248px] flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-[clamp(28px,5vw,40px)] leading-[1.4] font-bold">ابحث عن مكان</h1>
          <p className="text-ink-muted">كل الأماكن بتوفر فعلي، تحجزها مباشرة بدون مراسلات.</p>
        </div>

        {data === null ? (
          <p role="alert" className="rounded-lg border border-border bg-surface p-6 text-ink-muted">
            تعذّر تحميل الأماكن الآن. حاول تحديث الصفحة بعد قليل.
          </p>
        ) : (
          <div className="grid items-start gap-8 lg:grid-cols-[300px_1fr]">
            <aside className="rounded-lg border border-border bg-surface lg:sticky lg:top-[88px]">
              {/* على الجوال: الفلاتر مطوية افتراضيًا */}
              <details className="group lg:hidden">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold">
                  الفلاتر
                  <ChevronDownIcon className="transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-border p-4">
                  <SearchFilters
                    idPrefix="m"
                    params={params}
                    cities={data.cities}
                    amenities={data.amenities}
                  />
                </div>
              </details>
              <div className="hidden p-5 lg:block">
                <SearchFilters
                  idPrefix="d"
                  params={params}
                  cities={data.cities}
                  amenities={data.amenities}
                />
              </div>
            </aside>

            <section aria-labelledby="results-title" className="flex min-w-0 flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="results-title" className="text-label-lg font-semibold" aria-live="polite">
                  {placesCount(data.places.length)}
                </h2>
                <nav aria-label="الترتيب" className="flex flex-wrap gap-2">
                  {SORTS.map((s) => (
                    <Link
                      key={s.key}
                      href={sortHref(raw, s.key)}
                      aria-current={activeSort === s.key ? "true" : undefined}
                      className={cn(
                        "inline-flex h-11 items-center rounded-pill border px-4 text-label transition-colors sm:h-9",
                        activeSort === s.key
                          ? "border-brand bg-brand-subtle font-semibold text-brand"
                          : "border-border-strong text-ink-muted hover:text-ink",
                      )}
                    >
                      {s.label}
                    </Link>
                  ))}
                </nav>
              </div>

              {data.places.length === 0 ? (
                <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-6">
                  <p className="font-semibold">ما لقينا أماكن تطابق بحثك.</p>
                  <p className="text-ink-muted">جرّب تخفف الفلاتر أو تبحث بمدينة ثانية.</p>
                  <Link href="/places" className="font-semibold text-brand hover:text-brand-hover">
                    عرض كل الأماكن
                  </Link>
                </div>
              ) : (
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6">
                  {data.places.map((pl) => (
                    <li key={pl.slug}>
                      <PlaceCard place={pl} query={query} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
