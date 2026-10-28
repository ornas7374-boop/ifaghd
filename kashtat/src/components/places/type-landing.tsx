import type { Metadata } from "next";
import Link from "next/link";
import { PlaceCard } from "@/components/places/place-card";
import { breadcrumbLd, JsonLd } from "@/components/seo/json-ld";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ButtonLink } from "@/components/ui/button";
import { cache } from "react";
import { searchPlaces, type PlaceCard as PlaceCardData } from "@/lib/db/places";
import { getGuide } from "@/lib/guides";
import { formatSar } from "@/lib/money";
import { placesCount } from "@/lib/plural";
import { pageMeta } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { TYPE_LIST, type TypePage } from "@/lib/type-content";

// نفس الطلب يُستخدم في generateMetadata والصفحة
export const loadTypePlaces = cache(async (page: TypePage): Promise<PlaceCardData[] | null> => {
  try {
    return await searchPlaces({ kind: page.kind });
  } catch (err) {
    console.error(err);
    return null;
  }
});

export function typeMetadata(page: TypePage, places: PlaceCardData[] | null): Metadata {
  const cover = places?.[0]?.cover;
  return pageMeta({
    title: page.title,
    description: page.description,
    path: page.path,
    image: cover ? { url: cover.src, alt: cover.alt } : undefined,
  });
}

export function TypeLanding({ page, places }: { page: TypePage; places: PlaceCardData[] | null }) {
  const list = places ?? [];
  const prices = list.flatMap((p) => (p.price ? [p.price.amount] : []));
  // المدن اللي فيها هذا النوع، مرتبة بعدد الأماكن
  const cities = [
    ...list
      .reduce((m, p) => {
        const c = m.get(p.citySlug) ?? { slug: p.citySlug, name: p.city, count: 0 };
        c.count += 1;
        return m.set(p.citySlug, c);
      }, new Map<string, { slug: string; name: string; count: number }>())
      .values(),
  ].sort((a, b) => b.count - a.count);
  const url = absoluteUrl(page.path);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "الرئيسية", url: absoluteUrl("/") },
            { name: page.label, url },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: page.h1,
            numberOfItems: list.length,
            itemListElement: list.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: absoluteUrl(`/places/${p.slug}`),
              name: p.title,
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: page.faq.map((f) => ({
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
              {page.label}
            </li>
          </ol>
        </nav>

        <header className="mb-8 flex max-w-[760px] flex-col gap-4">
          <h1 className="text-[clamp(28px,5vw,40px)] leading-[1.4] font-bold">{page.h1}</h1>
          {page.intro.map((p) => (
            <p key={p.slice(0, 24)} className="text-body-lg text-ink-muted">
              {p}
            </p>
          ))}
          {list.length > 0 && (
            <p className="text-body-sm text-ink-muted">
              {placesCount(list.length)}
              {cities.length > 0 && ` في ${cities.map((c) => c.name).join("، ")}`}
              {prices.length > 0 && ` · تبدأ من ${formatSar(Math.min(...prices))}`}
            </p>
          )}
        </header>

        {cities.length > 0 && (
          <nav aria-label={`${page.label} حسب المدينة`} className="mb-10">
            <ul className="flex flex-wrap gap-2">
              {cities.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/cities/${c.slug}`}
                    className="inline-flex h-10 items-center rounded-pill border border-border-strong px-4 text-label hover:border-brand hover:text-brand"
                  >
                    {page.kind === "wild"
                      ? `${page.label} في ${c.name}`
                      : `${page.label} ${c.name}`}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <section aria-labelledby="type-places" className="mb-14 flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="type-places" className="text-[22px] leading-8 font-bold">
              {page.label} متاحة للحجز
            </h2>
            <ButtonLink href={`/places?kind=${page.kind}`} variant="secondary">
              فلترة النتائج
            </ButtonLink>
          </div>
          {places === null ? (
            <p
              role="alert"
              className="rounded-lg border border-border bg-surface p-6 text-ink-muted"
            >
              تعذّر تحميل الأماكن الآن. حاول تحديث الصفحة بعد قليل.
            </p>
          ) : list.length === 0 ? (
            <p className="rounded-lg border border-border bg-surface p-6 text-ink-muted">
              ما فيه أماكن منشورة من هذا النوع حاليًا.{" "}
              <Link href="/places" className="font-semibold text-brand hover:text-brand-hover">
                تصفح كل الأماكن
              </Link>
            </p>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6">
              {list.map((pl) => (
                <li key={pl.slug}>
                  <PlaceCard place={pl} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="type-faq" className="mb-14 flex max-w-[760px] flex-col gap-4">
          <h2 id="type-faq" className="text-[22px] leading-8 font-bold">
            أسئلة شائعة عن {page.labelDefinite}
          </h2>
          {page.faq.map((f) => (
            <details key={f.q} className="rounded-lg border border-border bg-surface p-4">
              <summary className="cursor-pointer font-semibold">{f.q}</summary>
              <p className="mt-2 text-ink-muted">{f.a}</p>
            </details>
          ))}
        </section>

        {page.guide && getGuide(page.guide) && (
          <p className="mb-8 rounded-lg border border-border bg-surface p-4">
            <span className="text-ink-muted">دليل مفيد: </span>
            <Link
              href={`/guides/${page.guide}`}
              className="font-semibold text-brand hover:text-brand-hover"
            >
              {getGuide(page.guide)!.title}
            </Link>
          </p>
        )}

        <nav aria-label="أنواع أخرى" className="flex flex-wrap gap-3 border-t border-border pt-8">
          <span className="text-ink-muted">تصفح أيضًا:</span>
          {TYPE_LIST.filter((t) => t.kind !== page.kind).map((t) => (
            <Link
              key={t.kind}
              href={t.path}
              className="font-semibold text-brand hover:text-brand-hover"
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </main>
      <SiteFooter />
    </>
  );
}
