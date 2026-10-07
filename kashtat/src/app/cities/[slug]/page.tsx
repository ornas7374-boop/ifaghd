import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PlaceCard } from "@/components/places/place-card";
import { breadcrumbLd, JsonLd } from "@/components/seo/json-ld";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ButtonLink } from "@/components/ui/button";
import { cityIntro } from "@/lib/city-content";
import { getCities, getCityBySlug, PLACE_KIND_LABEL, searchPlaces } from "@/lib/db/places";
import { formatSar } from "@/lib/money";
import { placesCount } from "@/lib/plural";
import { clip, pageMeta } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 300;

export async function generateStaticParams() {
  const cities = await getCities().catch(() => []);
  return cities.map((c) => ({ slug: c.slug }));
}

const loadCity = cache(async (slug: string) => {
  const city = await getCityBySlug(slug);
  if (!city) return null;
  const places = await searchPlaces({ city: slug });
  return { city, places };
});

export async function generateMetadata(props: PageProps<"/cities/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await loadCity(slug).catch(() => null);
  if (!data) return { title: "المدينة غير موجودة", robots: { index: false } };
  const { city, places } = data;
  const meta = pageMeta({
    title: `كشتات ومخيمات ${city.name}: احجز أونلاين`,
    description: clip(
      `${places.length ? `${placesCount(places.length)} للكشتات والمخيمات في ${city.name}. ` : ""}${cityIntro(city.slug, city.name)}`,
    ),
    path: `/cities/${city.slug}`,
    image: places[0]?.cover ? { url: places[0].cover.src, alt: places[0].cover.alt } : undefined,
  });
  // مدينة بلا أماكن = صفحة فارغة: لا تُفهرس
  return places.length ? meta : { ...meta, robots: { index: false, follow: true } };
}

export default async function CityPage(props: PageProps<"/cities/[slug]">) {
  const { slug } = await props.params;
  const data = await loadCity(slug);
  if (!data) notFound();
  const { city, places } = data;

  const prices = places.flatMap((p) => (p.price ? [p.price.amount] : []));
  const kinds = [...new Set(places.map((p) => PLACE_KIND_LABEL[p.kind]))];
  const faq = [
    {
      q: `كم سعر الكشتة في ${city.name}؟`,
      a: prices.length
        ? `تبدأ الأسعار في ${city.name} من ${formatSar(Math.min(...prices))} وتختلف حسب المكان ونوع الحجز (بالساعة أو اليوم أو الليلة) وعدد الضيوف والإضافات.`
        : `الأسعار تختلف حسب المكان ونوع الحجز وعدد الضيوف. تابعنا، نضيف أماكن جديدة في ${city.name} باستمرار.`,
    },
    {
      q: `هل أقدر أحجز كشتة في ${city.name} بالساعة؟`,
      a: "نعم، كثير من الأماكن تدعم الحجز بالساعة لطلعة العصر أو السهرة، وتقدر تختار وقت البداية والمدة من صفحة المكان.",
    },
    {
      q: "هل الحجز مؤكد مباشرة؟",
      a: "نعم، التوفر في الموقع فعلي، والحجز يتأكد فورًا وتلقى تفاصيله في صفحة حجوزاتي بدون مراسلات.",
    },
  ];

  const url = absoluteUrl(`/cities/${city.slug}`);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "الرئيسية", url: absoluteUrl("/") },
            { name: `كشتات ${city.name}`, url },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `كشتات ومخيمات ${city.name}`,
            numberOfItems: places.length,
            itemListElement: places.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: absoluteUrl(`/places/${p.slug}`),
              name: p.title,
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[1248px] flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <nav aria-label="مسار التنقل" className="mb-5 text-body-sm text-ink-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-brand">
                الرئيسية
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink">
              {city.name}
            </li>
          </ol>
        </nav>

        <header className="mb-10 flex max-w-[760px] flex-col gap-4">
          <h1 className="text-[clamp(28px,5vw,40px)] leading-[1.4] font-bold">
            كشتات ومخيمات {city.name}
          </h1>
          <p className="text-body-lg text-ink-muted">{cityIntro(city.slug, city.name)}</p>
          {places.length > 0 && (
            <p className="text-body-sm text-ink-muted">
              {placesCount(places.length)}
              {kinds.length > 0 && ` · ${kinds.join("، ")}`}
              {prices.length > 0 && ` · تبدأ من ${formatSar(Math.min(...prices))}`}
            </p>
          )}
        </header>

        <section aria-labelledby="city-places" className="mb-14 flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="city-places" className="text-[22px] leading-8 font-bold">
              أماكن متاحة في {city.name}
            </h2>
            <ButtonLink href={`/places?city=${city.slug}`} variant="secondary">
              فلترة النتائج
            </ButtonLink>
          </div>
          {places.length === 0 ? (
            <p className="rounded-lg border border-border bg-surface p-6 text-ink-muted">
              ما فيه أماكن منشورة في {city.name} حاليًا.{" "}
              <Link href="/places" className="font-semibold text-brand hover:text-brand-hover">
                تصفح كل المدن
              </Link>
            </p>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6">
              {places.map((pl) => (
                <li key={pl.slug}>
                  <PlaceCard place={pl} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="city-faq" className="flex max-w-[760px] flex-col gap-4">
          <h2 id="city-faq" className="text-[22px] leading-8 font-bold">
            أسئلة عن الكشتات في {city.name}
          </h2>
          {faq.map((f) => (
            <details key={f.q} className="rounded-lg border border-border bg-surface p-4">
              <summary className="cursor-pointer font-semibold">{f.q}</summary>
              <p className="mt-2 text-ink-muted">{f.a}</p>
            </details>
          ))}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
