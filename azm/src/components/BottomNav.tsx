"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBranch, IconChart, IconHome, IconLifebuoy, IconTimer } from "./ui/icons";

const LEFT = [
  { href: "/", label: "اليوم", Icon: IconHome, match: (p: string) => p === "/" },
  { href: "/plans", label: "الخطط", Icon: IconBranch, match: (p: string) => p.startsWith("/plans") },
];
const RIGHT = [
  { href: "/timer", label: "المؤقت", Icon: IconTimer, match: (p: string) => p.startsWith("/timer") },
  { href: "/log", label: "السجل", Icon: IconChart, match: (p: string) => p.startsWith("/log") || p.startsWith("/insights") },
];

// شريط سفلي بأربع صفحات، وزر الطوارئ في النص — موجود دائمًا.
export function BottomNav() {
  const pathname = usePathname();

  const tab = ({ href, label, Icon, match }: (typeof LEFT)[number]) => {
    const active = match(pathname);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${active ? "text-accent" : "text-muted"}`}
      >
        <Icon />
        {label}
      </Link>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-lg items-end px-2">
        {LEFT.map(tab)}
        <Link
          href="/stuck"
          aria-label="أنا عالق الحين"
          className="-mt-6 mb-1 flex min-h-16 flex-[1.4] flex-col items-center justify-center rounded-2xl bg-sos px-2 text-sos-fg shadow-lg shadow-sos/25 transition active:scale-95"
        >
          <IconLifebuoy />
          <span className="text-sm font-bold">أنا عالق</span>
        </Link>
        {RIGHT.map(tab)}
      </div>
    </nav>
  );
}
