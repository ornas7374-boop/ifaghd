import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbLd, JsonLd } from "@/components/seo/json-ld";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { GUIDES } from "@/lib/guides";
import { pageMeta } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "أدلة الكشتات والمخيمات",
  description:
    "أدلة عملية للكشتات والمخيمات في السعودية: وين تلقى مخيمات للإيجار وكم أسعارها، ووش تجهز للكشتة، ونصائح قبل الحجز.",
  path: "/guides",
});

export default function GuidesPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "الرئيسية", url: absoluteUrl("/") },
          { name: "الأدلة", url: absoluteUrl("/guides") },
        ])}
      />
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[1248px] flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8 flex max-w-[760px] flex-col gap-3">
          <h1 className="text-[clamp(28px,5vw,40px)] leading-[1.4] font-bold">
            أدلة الكشتات والمخيمات
          </h1>
          <p className="text-body-lg text-ink-muted">
            نصائح عملية تساعدك تختار المكان المناسب وتجهز لطلعتك.
          </p>
        </header>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/guides/${g.slug}`}
                className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface-raised p-6 hover:border-brand"
              >
                <h2 className="text-[20px] leading-8 font-bold">{g.title}</h2>
                <p className="text-body-sm text-ink-muted">{g.description}</p>
                <span className="mt-auto font-semibold text-brand">اقرأ الدليل ←</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
