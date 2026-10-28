import Link from "next/link";
import type { ReactNode } from "react";
import { breadcrumbLd, JsonLd } from "@/components/seo/json-ld";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { absoluteUrl } from "@/lib/site";

/** صفحات المعلومات الثابتة (من نحن، تواصل، الخصوصية) */
export function InfoPage({
  path,
  title,
  updated,
  children,
}: {
  path: string;
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "الرئيسية", url: absoluteUrl("/") },
          { name: title, url: absoluteUrl(path) },
        ])}
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
              {title}
            </li>
          </ol>
        </nav>
        <article className="mx-auto flex max-w-[760px] flex-col gap-6 text-body-lg leading-8 [&_h2]:mt-4 [&_h2]:text-[24px] [&_h2]:leading-9 [&_h2]:font-bold [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:ps-6">
          <header className="flex flex-col gap-2">
            <h1 className="text-[clamp(28px,5vw,40px)] leading-[1.4] font-bold">{title}</h1>
            {updated && (
              <p className="text-caption text-ink-muted">
                آخر تحديث: <time dateTime={updated}>{updated}</time>
              </p>
            )}
          </header>
          {children}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
