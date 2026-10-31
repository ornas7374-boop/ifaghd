import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "المزيد — عَزم" };

const ITEMS = [
  { href: "/plans", emoji: "🔀", title: "خطط إذا–فإن", desc: "قرارات مسبقة مربوطة بأوقات ثابتة" },
  { href: "/program", emoji: "🗓️", title: "برنامج الـ30 يوم", desc: "مهمة واضحة لكل يوم" },
  { href: "/habits", emoji: "🌱", title: "العادات", desc: "التزام بدون سلسلة تنكسر" },
  { href: "/review", emoji: "📝", title: "المحاسبة الأسبوعية", desc: "كل خميس مساءً" },
  { href: "/control", emoji: "⚖️", title: "في يدي / ليس في يدي", desc: "حوّل القلق لمهام" },
  { href: "/tasks", emoji: "✅", title: "المهام", desc: "اللي طلع من المحاسبة والتمارين" },
  { href: "/constitution", emoji: "📜", title: "دستوري الشخصي", desc: "مرجعك الثابت، قابل للطباعة" },
  { href: "/insights", emoji: "📊", title: "التحليل", desc: "أنماط التسويف عندك" },
  { href: "/settings", emoji: "⚙️", title: "الإعدادات والتقويم", desc: "التذكيرات، النسخ الاحتياطي" },
];

export default function MorePage() {
  return (
    <div>
      <PageHeader title="المزيد" />
      <ul className="grid grid-cols-1 gap-3">
        {ITEMS.map((it) => (
          <li key={it.href}>
            <Link href={it.href} className="flex min-h-16 items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:border-muted active:scale-[0.99]">
              <span className="text-3xl" aria-hidden>
                {it.emoji}
              </span>
              <span>
                <span className="block text-lg font-semibold">{it.title}</span>
                <span className="block text-sm text-muted">{it.desc}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
