import Link from "next/link";
import type { ReactNode } from "react";
import { BookingId, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { formatBookingId } from "@/lib/booking-status";
import { cn } from "@/lib/cn";
import { FEATURED_PLACES } from "@/data/featured-places";
import { FavoriteButton } from "./favorite-button";

const sectionTitle = "m-0 text-[clamp(28px,5vw,36px)] leading-[1.45] font-bold";

function Icon({
  children,
  size = 28,
  className,
}: {
  children: ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

function Pill({ tone, children }: { tone: "brand" | "sand"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "self-start rounded-pill px-3 py-0.5 text-[13px] font-semibold",
        tone === "brand" ? "bg-brand-subtle text-brand" : "bg-sand-subtle text-sand",
      )}
    >
      {children}
    </span>
  );
}

/* ---------- أنواع الطلعات ---------- */

const CATEGORIES = [
  {
    title: "كشتات برية",
    desc: "جلسات وموقد في البر المفتوح",
    tone: "bg-brand-subtle text-brand",
    icon: (
      <>
        <path d="M3 20L12 4l9 16z" />
        <path d="M12 4v16" />
        <path d="M9.5 20L12 14l2.5 6" />
      </>
    ),
  },
  {
    title: "مخيمات",
    desc: "خيام مجهزة لليلة أو أكثر",
    tone: "bg-sand-subtle text-sand",
    icon: (
      <>
        <path d="M2 20h20" />
        <path d="M4 20l8-12 8 12" />
        <path d="M12 8V4l4 2-4 2" />
      </>
    ),
  },
  {
    title: "شاليهات",
    desc: "مسابح وخصوصية للعائلة",
    tone: "bg-info-subtle text-info",
    icon: (
      <>
        <path d="M3 11l9-7 9 7" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-6h4v6" />
      </>
    ),
  },
  {
    title: "استراحات",
    desc: "للسهرات والمناسبات بالساعة",
    tone: "bg-warning-subtle text-warning",
    icon: (
      <>
        <path d="M12 21V9" />
        <path d="M12 9c-2-3-6-3-8-1 3 0 5 1 8 1z" />
        <path d="M12 9c2-3 6-3 8-1-3 0-5 1-8 1z" />
        <path d="M12 9c-1-3-4-5-7-5 2 2 4 3 7 5z" />
        <path d="M12 9c1-3 4-5 7-5-2 2-4 3-7 5z" />
      </>
    ),
  },
  {
    title: "أماكن ترفيهية",
    desc: "مزارع وإطلالات وأنشطة",
    tone: "bg-brand-subtle text-brand",
    icon: (
      <>
        <path d="M2 20l7-11 4 6 3-4 6 9z" />
        <circle cx="17" cy="5" r="2" />
      </>
    ),
  },
];

export function Categories() {
  return (
    <section
      id="explore"
      aria-labelledby="explore-title"
      className="mx-auto flex max-w-[1248px] flex-col gap-8 px-4 pt-16 pb-10 sm:px-6 sm:pt-[88px]"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 id="explore-title" className={sectionTitle}>
            وش نوع طلعتك؟
          </h2>
          <p className="text-ink-muted">كل الأماكن بتوفر فعلي، تحجزها مباشرة بدون مراسلات.</p>
        </div>
        <Link href="#places" className="font-semibold text-brand hover:text-brand-hover">
          عرض كل الأماكن ←
        </Link>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
        {CATEGORIES.map((c) => (
          <li key={c.title}>
            <Link
              href="#places"
              className="tilt flex h-full flex-col gap-3.5 rounded-lg border border-border bg-surface-raised px-5 py-6 text-ink"
            >
              <span className={cn("grid size-[52px] place-items-center rounded-[12px]", c.tone)}>
                <Icon>{c.icon}</Icon>
              </span>
              <span className="text-[18px] font-bold">{c.title}</span>
              <span className="text-body-sm text-ink-muted">{c.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- الأماكن المميزة ---------- */

export function FeaturedPlaces() {
  return (
    <section
      id="places"
      aria-labelledby="places-title"
      className="mx-auto flex max-w-[1248px] flex-col gap-7 px-4 pt-10 pb-16 sm:px-6 sm:pb-[88px]"
    >
      <h2 id="places-title" className={sectionTitle}>
        أماكن مميزة هذا الأسبوع
      </h2>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-6">
        {FEATURED_PLACES.map((pl) => (
          <li key={pl.slug}>
            <article className="tilt flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface-raised">
              <div className="relative flex h-[180px] items-end justify-center overflow-hidden bg-surface-overlay text-ink-muted">
                <svg
                  width="100%"
                  height="110"
                  viewBox="0 0 300 110"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0"
                >
                  <path d="M0 70 Q60 30 120 62 T240 52 T300 60 V110 H0z" fill="var(--border)" />
                  <path
                    d="M0 92 Q80 60 160 88 T300 80 V110 H0z"
                    fill="var(--surface-raised)"
                    opacity=".7"
                  />
                </svg>
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[13px] font-medium">
                  صورة المكان
                </span>
                {pl.featured && (
                  <span className="absolute start-3 top-3 rounded-pill bg-sand-subtle px-2.5 py-0.5 text-caption font-semibold text-sand">
                    مميز
                  </span>
                )}
                <FavoriteButton placeName={pl.name} />
              </div>
              <div className="flex grow flex-col gap-2.5 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[18px] leading-7 font-bold">{pl.name}</h3>
                  <span className="text-body-sm font-semibold whitespace-nowrap">
                    <span aria-hidden="true">★ </span>
                    <span className="sr-only">التقييم </span>
                    {pl.rating}
                  </span>
                </div>
                <span className="text-body-sm text-ink-muted">{pl.where}</span>
                <ul className="flex flex-wrap gap-1.5" aria-label="المرافق">
                  {pl.tags.map((tg) => (
                    <li
                      key={tg}
                      className="rounded-pill border border-border-strong px-2.5 py-px text-caption text-ink-muted"
                    >
                      {tg}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
                  <span className="text-[18px] font-bold">
                    {pl.price} ر.س{" "}
                    <span className="text-body-sm font-normal text-ink-muted">/ {pl.unit}</span>
                  </span>
                  <ButtonLink
                    href={`/places/${pl.slug}`}
                    prefetch={false}
                    size="sm"
                    className="h-11 sm:h-10"
                    aria-label={`احجز ${pl.name}`}
                  >
                    احجز
                  </ButtonLink>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- كيف يعمل ---------- */

const STEPS = [
  {
    title: "ابحث وقارن",
    desc: "بالمدينة أو على الخريطة، وفلتر بالسعر والتقييم والمرافق والطاقة الاستيعابية.",
  },
  {
    title: "اختر وقتك وإضافاتك",
    desc: "بالساعة أو اليوم أو الليلة، مع بروجكتر أو خيمة إضافية أو جلسات.",
  },
  {
    title: "ادفع إلكترونيًا",
    desc: "عبر مزود دفع معتمد يدعم مدى وApple Pay، ويصلك رقم الحجز مباشرة.",
  },
  {
    title: "استمتع وقيّم",
    desc: "التقييم متاح فقط بعد اكتمال الحجز، فكل تقييم تشوفه من تجربة حقيقية.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title" className="border-y border-border bg-surface">
      <div className="mx-auto flex max-w-[1248px] flex-col gap-10 px-4 py-16 sm:px-6 sm:py-[88px]">
        <div className="flex max-w-[640px] flex-col gap-2">
          <h2 id="how-title" className={sectionTitle}>
            من البحث إلى الموقد في أربع خطوات
          </h2>
          <p className="text-ink-muted">
            حجز مباشر بتوفر فعلي، وتأكيد يوصلك ويوصل صاحب المكان فورًا.
          </p>
        </div>
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-5">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface-raised p-6"
            >
              <span
                aria-hidden="true"
                className="num3d font-mono text-[56px] leading-[64px] font-bold text-brand"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-[20px] leading-[30px] font-semibold">{s.title}</h3>
              <p className="text-[15px] text-ink-muted">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- الحجز بالساعة ---------- */

const TIMELINE: Array<{ label: string; start: number; width: number; bar: string }> = [
  {
    label: "الحجز المتعاقد",
    start: 16.67,
    width: 50,
    bar: "border-2 border-brand bg-brand-subtle",
  },
  { label: "الإقامة الفعلية", start: 16.67, width: 33.33, bar: "bg-brand" },
  { label: "فترة التجهيز", start: 50, width: 8.33, bar: "border-2 border-sand bg-sand-subtle" },
  {
    label: "متاح للحجز التالي",
    start: 58.33,
    width: 41.67,
    bar: "border-2 border-info bg-info-subtle",
  },
];

const HOURS = ["3 م", "4 م", "5 م", "6 م", "7 م", "8 م", "9 م"];

function Check() {
  return (
    <Icon size={22} className="mt-0.5 flex-none text-brand">
      <path d="M5 12l5 5L20 7" />
    </Icon>
  );
}

export function HourlyBooking() {
  return (
    <section
      id="hourly"
      aria-labelledby="hourly-title"
      className="mx-auto flex max-w-[1248px] flex-wrap items-center gap-12 px-4 py-16 sm:px-6 sm:py-[88px]"
    >
      <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-[18px]">
        <Pill tone="brand">جديد في الحجز</Pill>
        <h2 id="hourly-title" className={sectionTitle}>
          احجز بالساعة، وادفع على قد طلعتك.
        </h2>
        <p className="text-[17px] leading-[30px] text-ink-muted">
          لا تحتاج تحجز يوم كامل لسهرة أربع ساعات. والنظام يفصل بين وقت حجزك ووقت خروجك الفعلي وفترة
          تجهيز المكان، فما فيه تعارض بين الحجوزات.
        </p>
        <ul className="flex flex-col gap-3">
          {[
            "توفر فعلي محدث لحظيًا من صاحب المكان",
            "خدمات إضافية مسعّرة للحجز أو للساعة أو للشخص",
            "السعر النهائي واضح قبل الدفع، شامل الإضافات والخصومات",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5">
              <Check />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      <figure className="tilt flex min-w-0 flex-[1_1_480px] flex-col gap-3.5 rounded-lg border border-border bg-surface-raised p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[18px] leading-7 font-semibold">يوم الخميس · مخيم الوادي</h3>
          <StatusBadge status="confirmed" />
        </div>
        {TIMELINE.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[96px_1fr] items-center gap-3.5 sm:grid-cols-[130px_1fr]"
          >
            <span className="text-body-sm font-semibold">{row.label}</span>
            <div className="relative h-4 rounded-pill bg-surface-overlay">
              <div
                className={cn("absolute inset-y-0 rounded-pill", row.bar)}
                style={{ insetInlineStart: `${row.start}%`, width: `${row.width}%` }}
              />
            </div>
          </div>
        ))}
        <div
          className="grid grid-cols-[96px_1fr] gap-3.5 sm:grid-cols-[130px_1fr]"
          aria-hidden="true"
        >
          <span />
          <div className="flex justify-between text-caption text-ink-muted">
            {HOURS.map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
        </div>
        <figcaption className="mt-1 text-body-sm text-ink-muted">
          حجز من 4:00 م إلى 8:00 م، خروج فعلي 7:00 م، وتجهيز 30 دقيقة: المكان متاح من 7:30 م دون
          المساس بحق الحجز الأصلي.
        </figcaption>
      </figure>
    </section>
  );
}

/* ---------- لأصحاب الأماكن ---------- */

const OWNER_ROWS = [
  { n: 0, when: "الخميس · 4:00 – 8:00 م", status: "confirmed" as const },
  { n: 1, when: "الجمعة · ليلة كاملة", status: "pending_payment" as const },
  { n: 2, when: "السبت · 2:00 – 6:00 م", status: "completed" as const },
];

export function Owners() {
  return (
    <section
      id="owners"
      aria-labelledby="owners-title"
      className="overflow-hidden border-y border-border bg-surface"
    >
      <div className="mx-auto flex max-w-[1248px] flex-wrap items-center gap-14 px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-[18px]">
          <Pill tone="sand">لأصحاب الأماكن</Pill>
          <h2 id="owners-title" className={sectionTitle}>
            مكانك يشتغل، وأنت تتابع من لوحة وحدة.
          </h2>
          <p className="text-[17px] leading-[30px] text-ink-muted">
            أضف مكانك وصوره ومرافقه، حدد أسعارك وأوقات الدخول والخروج وفترات التجهيز، وتابع حجوزاتك
            ومستحقاتك الصافية بعد العمولة.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/owners/new" prefetch={false} size="lg" className="px-6">
              أضف مكانك الآن
            </ButtonLink>
            <ButtonLink href="#how" variant="secondary" size="lg" className="px-6">
              كيف تُحسب العمولة؟
            </ButtonLink>
          </div>
        </div>

        <div className="min-w-0 flex-[1_1_520px] py-6">
          <figure
            aria-label="مثال للوحة صاحب المكان"
            className="deck flex flex-col gap-[18px] rounded-[20px] border border-border bg-surface-raised p-4 shadow-md sm:p-6"
          >
            <div className="flex items-center justify-between">
              <span className="text-[18px] font-bold">لوحة صاحب المكان</span>
              <span className="text-[13px] text-ink-muted">هذا الشهر</span>
            </div>
            <dl className="layer grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { k: "قيمة الحجوزات", v: "500 ر.س", hi: false },
                { k: "عمولة المنصة 10%", v: "50 ر.س", hi: false },
                { k: "صافي مستحقاتك", v: "450 ر.س", hi: true },
              ].map((s) => (
                <div
                  key={s.k}
                  className={cn(
                    "flex min-w-0 flex-col gap-0.5 rounded-[12px] border p-2.5 sm:p-3.5",
                    s.hi ? "border-brand bg-brand-subtle" : "border-border bg-surface",
                  )}
                >
                  <dt
                    className={cn(
                      "text-[12px] sm:text-[13px]",
                      s.hi ? "text-brand" : "text-ink-muted",
                    )}
                  >
                    {s.k}
                  </dt>
                  <dd
                    className={cn(
                      "text-[18px] leading-8 font-bold sm:text-[24px] sm:leading-9",
                      s.hi && "text-brand",
                    )}
                  >
                    {s.v}
                  </dd>
                </div>
              ))}
            </dl>
            <ul className="flex flex-col overflow-hidden rounded-[12px] border border-border">
              {OWNER_ROWS.map((r, i) => (
                <li
                  key={r.n}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-3",
                    i > 0 && "border-t border-border",
                    i % 2 === 0 && "bg-surface",
                  )}
                >
                  <BookingId>{formatBookingId(r.n)}</BookingId>
                  <span className="text-body-sm">{r.when}</span>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          </figure>
        </div>
      </div>
    </section>
  );
}

/* ---------- الثقة ---------- */

const TRUST = [
  {
    title: "دفع آمن",
    desc: "ما نخزن بيانات بطاقتك. الدفع يتم عبر مزود دفع معتمد.",
    color: "text-brand",
    icon: (
      <>
        <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  },
  {
    title: "تقييمات حقيقية",
    desc: "كل تقييم مربوط برقم حجز مكتمل.",
    color: "text-sand",
    icon: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  },
  {
    title: "على الخريطة",
    desc: "شوف الأماكن حولك والمسافة التقريبية قبل تحجز.",
    color: "text-info",
    icon: (
      <>
        <path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
  },
];

export function Trust() {
  return (
    <section
      aria-label="لماذا الكشتات"
      className="mx-auto max-w-[1248px] px-4 py-16 sm:px-6 sm:py-[88px]"
    >
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
        {TRUST.map((t) => (
          <li key={t.title} className="flex flex-col gap-2.5 rounded-lg border border-border p-6">
            <Icon className={t.color}>{t.icon}</Icon>
            <h3 className="text-[19px] font-semibold">{t.title}</h3>
            <p className="text-[15px] text-ink-muted">{t.desc}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- الختام ---------- */

export function FinalCta() {
  return (
    <section
      aria-labelledby="cta-title"
      className="mx-auto w-full max-w-[1248px] px-4 pb-24 sm:px-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-[24px] bg-brand px-6 py-10 text-on-brand sm:px-10 sm:py-14">
        <div className="flex max-w-[560px] flex-col gap-2">
          <h2 id="cta-title" className={sectionTitle}>
            الطلعة الجاية عليك، والحجز علينا.
          </h2>
          <p className="text-[17px] opacity-90">ابدأ البحث الآن واحجز مكانك في دقيقة.</p>
        </div>
        <Link
          href="#top"
          className="inline-flex h-[52px] items-center rounded-md bg-on-brand px-7 text-[16px] font-bold text-brand transition-opacity hover:opacity-90"
        >
          ابدأ البحث
        </Link>
      </div>
    </section>
  );
}
