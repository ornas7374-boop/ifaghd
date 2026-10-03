import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Badge, BookingId, StatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { SearchIcon, TentIcon } from "@/components/ui/icons";
import { PlaceCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BOOKING_STATUSES, formatBookingId } from "@/lib/booking-status";
import { FormDemo, LoadingButtonDemo, ModalDemo, ToastDemo } from "./interactive-demos";

export const metadata: Metadata = {
  title: "دليل المكوّنات",
  robots: { index: false, follow: false },
};

const colorGroups: Array<{ title: string; tokens: string[] }> = [
  {
    title: "الأسطح",
    tokens: ["bg", "surface", "surface-raised", "surface-overlay", "border", "border-strong"],
  },
  { title: "النص", tokens: ["ink", "ink-muted"] },
  {
    title: "الهوية",
    tokens: ["brand", "brand-hover", "brand-subtle", "on-brand", "focus", "sand", "sand-subtle"],
  },
  {
    title: "الحالات",
    tokens: [
      "success",
      "warning",
      "warning-subtle",
      "danger",
      "danger-subtle",
      "info",
      "info-subtle",
    ],
  },
];

const typeScale = [
  { cls: "text-display-xl font-bold", name: "display-xl · 56/72", sample: "اكتشف مكان كشتتك" },
  { cls: "text-display-lg font-bold", name: "display-lg · 40/56", sample: "الأماكن المميزة" },
  { cls: "text-display-md font-bold", name: "display-md · 28/40", sample: "تفاصيل الحجز" },
  { cls: "text-body-lg", name: "body-lg · 18/30", sample: "مخيم بري مجهز على بعد ساعة من الرياض" },
  { cls: "text-body", name: "body · 16/26", sample: "احجز بالساعة أو بالليلة" },
  { cls: "text-body-sm", name: "body-sm · 14/22", sample: "الموقع التقريبي على الخريطة" },
  { cls: "text-caption font-medium", name: "caption · 12/18", sample: "آخر تحديث اليوم" },
  { cls: "text-label font-semibold", name: "label · 14/20", sample: "عدد الأشخاص" },
  { cls: "text-label-lg font-semibold", name: "label-lg · 16/24", sample: "أكمل الحجز" },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5 border-t border-border pt-10">
      <h2 id={id} className="text-display-md font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <div className="flex-1">
      <header className="sticky top-0 z-20 border-b border-border bg-bg">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <p className="text-[26px] leading-9 font-bold">الكشتات</p>
          <div className="flex items-center gap-3">
            <span className="hidden text-body-sm text-ink-muted sm:inline">دليل المكوّنات</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 py-10 sm:px-6 sm:py-16">
        <div className="flex flex-col gap-3">
          <Badge tone="sand" className="self-start">
            المرحلة 1 · الأساس والهوية
          </Badge>
          <h1 className="text-[clamp(36px,6vw,56px)] leading-[1.25] font-bold">دليل المكوّنات</h1>
          <p className="max-w-[560px] text-body-lg text-ink-muted">
            كل عناصر الواجهة مبنية من رموز الهوية. بدّل الثيم من الأعلى لمراجعة الداكن والفاتح.
          </p>
        </div>

        <Section id="colors" title="الألوان">
          <div className="flex flex-col gap-6">
            {colorGroups.map((g) => (
              <div key={g.title} className="flex flex-col gap-3">
                <h3 className="text-label-lg font-semibold">{g.title}</h3>
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                  {g.tokens.map((t) => (
                    <li
                      key={t}
                      className="overflow-hidden rounded-lg border border-border bg-surface"
                    >
                      <div
                        className="h-16 border-b border-border"
                        style={{ background: `var(--${t})` }}
                      />
                      <p
                        dir="ltr"
                        className="px-3 py-2 text-start font-mono text-[13px] text-ink-muted"
                      >
                        --{t}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section id="type" title="الخطوط">
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
            {typeScale.map((t) => (
              <li
                key={t.name}
                className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <span className={t.cls}>{t.sample}</span>
                <span dir="ltr" className="shrink-0 font-mono text-[13px] text-ink-muted">
                  {t.name}
                </span>
              </li>
            ))}
            <li className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <BookingId>{formatBookingId(482)}</BookingId>
              <span dir="ltr" className="shrink-0 font-mono text-[13px] text-ink-muted">
                booking-id · mono 13/20
              </span>
            </li>
          </ul>
        </Section>

        <Section id="buttons" title="الأزرار">
          <div className="flex flex-wrap items-center gap-3">
            <Button>أضف مكانك</Button>
            <Button variant="secondary">تسجيل الدخول</Button>
            <Button variant="ghost">عرض الكل</Button>
            <Button variant="danger">إلغاء الحجز</Button>
            <Button disabled>غير متاح</Button>
            <LoadingButtonDemo />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="secondary">
              صغير
            </Button>
            <Button size="md">متوسط</Button>
            <Button size="lg">
              <SearchIcon />
              ابحث
            </Button>
            <ButtonLink href="/styleguide#forms" variant="secondary">
              رابط بشكل زر
            </ButtonLink>
          </div>
        </Section>

        <Section id="badges" title="الشارات والحالات">
          <div className="flex flex-wrap items-center gap-2">
            {BOOKING_STATUSES.map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="sand">مميز</Badge>
            <Badge>واي فاي</Badge>
            <Badge>دورة مياه</Badge>
            <Badge>جلسة خارجية</Badge>
            <Badge>شبة نار</Badge>
          </div>
          <p className="text-body-sm text-ink-muted">كل حالة لها كلمة مكتوبة، واللون مساعد فقط.</p>
        </Section>

        <Section id="forms" title="النماذج">
          <Card>
            <FormDemo />
          </Card>
        </Section>

        <Section id="cards" title="البطاقات">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6">
            <Card className="flex flex-col gap-3">
              <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-surface-overlay text-ink-muted">
                <TentIcon size={40} />
              </div>
              <div className="flex items-start justify-between gap-2">
                <CardTitle>[اسم المكان]</CardTitle>
                <Badge tone="sand">مميز</Badge>
              </div>
              <CardMeta>[المدينة] · حتى [عدد] أشخاص</CardMeta>
              <p className="text-label font-semibold text-brand">[السعر] ر.س / ساعة</p>
            </Card>
            <Card className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <BookingId>{formatBookingId(1031)}</BookingId>
                <StatusBadge status="confirmed" />
              </div>
              <CardTitle>[اسم المكان]</CardTitle>
              <CardMeta>[التاريخ] · [من] إلى [إلى]</CardMeta>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="secondary">
                  التفاصيل
                </Button>
                <Button size="sm" variant="ghost">
                  الاتجاهات
                </Button>
              </div>
            </Card>
            <PlaceCardSkeleton />
          </div>
        </Section>

        <Section id="feedback" title="النوافذ والتنبيهات">
          <div className="flex flex-wrap items-start gap-6">
            <ModalDemo />
            <ToastDemo />
          </div>
        </Section>

        <Section id="skeleton" title="هياكل التحميل">
          <div className="flex max-w-md flex-col gap-3" role="status" aria-label="جارٍ التحميل">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </Section>
      </main>
    </div>
  );
}
