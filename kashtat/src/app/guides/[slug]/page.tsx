import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CityPrices } from "@/components/guides/city-prices";
import { breadcrumbLd, JsonLd } from "@/components/seo/json-ld";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getGuide, GUIDES, type GuideBlock } from "@/lib/guides";
import { pageMeta } from "@/lib/seo";
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata(props: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const guide = getGuide((await props.params).slug);
  if (!guide) return {};
  const meta = pageMeta({
    title: guide.metaTitle,
    description: guide.description,
    path: `/guides/${guide.slug}`,
  });
  return {
    ...meta,
    openGraph: {
      ...meta.openGraph,
      type: "article",
      publishedTime: guide.published,
      modifiedTime: guide.updated,
    },
  };
}

const dateFmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "long" });

function Block({ block }: { block: GuideBlock }) {
  switch (block.type) {
    case "p":
      return <p className="text-body-lg leading-8">{block.text}</p>;
    case "list":
      return (
        <ul className="flex list-disc flex-col gap-2 ps-6 text-body-lg leading-8">
          {block.items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
      );
    case "city-prices":
      return <CityPrices city={block.city} />;
    case "links":
      return (
        <ul className="flex flex-wrap gap-2">
          {block.items.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="inline-flex h-10 items-center rounded-pill border border-border-strong px-4 text-label font-semibold hover:border-brand hover:text-brand"
              >
                {l.label} ←
              </Link>
            </li>
          ))}
        </ul>
      );
  }
}

export default async function GuidePage(props: PageProps<"/guides/[slug]">) {
  const guide = getGuide((await props.params).slug);
  if (!guide) notFound();
  const url = absoluteUrl(`/guides/${guide.slug}`);
  const others = GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "الرئيسية", url: absoluteUrl("/") },
            { name: "الأدلة", url: absoluteUrl("/guides") },
            { name: guide.title, url },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: guide.title,
            description: guide.description,
            datePublished: guide.published,
            dateModified: guide.updated,
            inLanguage: "ar-SA",
            mainEntityOfPage: url,
            image: absoluteUrl(DEFAULT_OG_IMAGE),
            author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
            publisher: { "@id": `${SITE_URL}/#organization` },
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
            <li>
              <Link href="/guides" className="hover:text-brand">
                الأدلة
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink">
              {guide.title}
            </li>
          </ol>
        </nav>

        <article className="mx-auto flex max-w-[760px] flex-col gap-10">
          <header className="flex flex-col gap-4">
            <h1 className="text-[clamp(28px,5vw,40px)] leading-[1.4] font-bold">{guide.title}</h1>
            <p className="text-caption text-ink-muted">
              آخر تحديث:{" "}
              <time dateTime={guide.updated}>{dateFmt.format(new Date(guide.updated))}</time>
            </p>
            <p className="text-body-lg leading-8 text-ink-muted">{guide.intro}</p>
            <nav
              aria-label="محتويات الدليل"
              className="rounded-lg border border-border bg-surface p-4"
            >
              <p className="mb-2 font-semibold">في هذا الدليل</p>
              <ol className="flex list-decimal flex-col gap-1 ps-6">
                {guide.sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="text-brand hover:text-brand-hover">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </header>

          {guide.sections.map((s) => (
            <section
              key={s.id}
              id={s.id}
              aria-labelledby={`${s.id}-title`}
              className="flex flex-col gap-4"
            >
              <h2 id={`${s.id}-title`} className="text-[24px] leading-9 font-bold">
                {s.title}
              </h2>
              {s.blocks.map((b, i) => (
                <Block key={i} block={b} />
              ))}
            </section>
          ))}

          {others.length > 0 && (
            <aside className="border-t border-border pt-8">
              <p className="mb-3 font-semibold">أدلة أخرى</p>
              <ul className="flex flex-col gap-2">
                {others.map((g) => (
                  <li key={g.slug}>
                    <Link href={`/guides/${g.slug}`} className="text-brand hover:text-brand-hover">
                      {g.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
