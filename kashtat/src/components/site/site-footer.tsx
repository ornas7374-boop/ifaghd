import Link from "next/link";

const COLUMNS = [
  {
    title: "المنصة",
    links: [
      { href: "/#explore", label: "استكشف الأماكن" },
      { href: "/#how", label: "كيف يعمل" },
      { href: "/#hourly", label: "الحجز بالساعة" },
    ],
  },
  {
    title: "أصحاب الأماكن",
    links: [
      { href: "/#owners", label: "أضف مكانك" },
      { href: "/#owners", label: "لوحة التحكم" },
      { href: "/#owners", label: "العمولات" },
    ],
  },
  {
    title: "الدعم",
    links: [
      { href: "/faq", label: "الأسئلة الشائعة" },
      { href: "/cancellation-policy", label: "سياسة الإلغاء" },
      { href: "/contact", label: "تواصل معنا" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-[1248px] grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-8 px-4 py-12 text-[15px] sm:px-6">
        <div className="flex flex-col gap-2.5">
          <span className="text-[22px] font-bold">الكشتات</span>
          <p className="text-body-sm text-ink-muted">
            منصة سعودية لاكتشاف وحجز الكشتات والأماكن الترفيهية.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-col gap-2">
            <h2 className="text-[15px] font-bold">{col.title}</h2>
            <ul className="flex flex-col gap-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    prefetch={l.href.startsWith("/#") ? undefined : false}
                    className="inline-block py-0.5 hover:text-brand"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto max-w-[1248px] px-4 pt-4 pb-8 text-[13px] text-ink-muted sm:px-6">
        © {new Date().getFullYear()} الكشتات
      </div>
    </footer>
  );
}
