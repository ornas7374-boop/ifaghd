import Link from "next/link";
import { FOOTER_CITIES } from "@/lib/city-content";

const COLUMNS = [
  {
    title: "المنصة",
    links: [
      { href: "/places", label: "كل الأماكن" },
      { href: "/#how", label: "كيف يعمل" },
      { href: "/#hourly", label: "الحجز بالساعة" },
    ],
  },
  {
    title: "كشتات حسب المدينة",
    links: FOOTER_CITIES.map((c) => ({ href: `/cities/${c.slug}`, label: `كشتات ${c.name}` })),
  },
  {
    title: "أصحاب الأماكن",
    links: [
      { href: "/#owners", label: "ليش تنضم معنا" },
      { href: "/owner/places/new", label: "أضف مكانك" },
      { href: "/owner", label: "لوحة التحكم" },
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
                    prefetch={false}
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
