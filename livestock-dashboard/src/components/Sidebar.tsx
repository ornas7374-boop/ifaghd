"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, ListChecks, PenSquare, X, type LucideIcon } from "lucide-react";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/data-entry", label: "إدخال البيانات", icon: PenSquare },
  { href: "/records", label: "البيانات", icon: ListChecks },
  { href: "/reports", label: "التقارير", icon: BarChart3 },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-1 p-3" aria-label="التنقل الرئيسي">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-[var(--series-1)]/12 text-[var(--series-1)]"
                : "text-ink-secondary hover:bg-surface-2 hover:text-ink"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={18} strokeWidth={active ? 2.4 : 2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileSidebarHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-hairline p-4">
      <span className="font-bold text-ink">القائمة</span>
      <button
        onClick={onClose}
        className="rounded-lg p-1.5 text-ink-secondary hover:bg-surface-2"
        aria-label="إغلاق القائمة"
      >
        <X size={20} />
      </button>
    </div>
  );
}
