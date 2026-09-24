"use client";

import { BarChart3, Home, Package, Settings, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

const ITEMS = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/automations", label: "Automations", icon: Workflow },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 flex h-16 border-t border-border bg-sidebar/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-medium", active ? "text-fg" : "text-dim")}>
            <Icon className={cn("size-5", active && "text-accent")} strokeWidth={1.5} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
