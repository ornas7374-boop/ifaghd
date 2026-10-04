import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AuthNav } from "./auth-nav";

const NAV = [
  { href: "/#explore", label: "استكشف" },
  { href: "/#how", label: "كيف يعمل" },
  { href: "/#hourly", label: "الحجز بالساعة" },
  { href: "/#owners", label: "لأصحاب الأماكن" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg">
      <nav
        aria-label="الرئيسية"
        className="mx-auto flex max-w-[1248px] flex-wrap items-center gap-x-8 gap-y-4 px-4 py-3.5 sm:px-6"
      >
        <Link href="/" className="text-[26px] leading-9 font-bold text-ink hover:text-brand">
          الكشتات
        </Link>
        <ul className="hidden grow gap-7 text-[15px] font-medium min-[721px]:flex">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link href={n.href} className="hover:text-brand">
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ms-auto flex items-center gap-2.5">
          <ThemeToggle />
          <AuthNav />
          {/* على الشاشات الضيقة نُبقي زر الدخول فقط */}
          <span className="hidden min-[421px]:contents">
            <ButtonLink href="/#owners">أضف مكانك</ButtonLink>
          </span>
        </div>
      </nav>
    </header>
  );
}
