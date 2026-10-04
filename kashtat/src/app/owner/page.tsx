import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Badge, BookingId, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { formatBookingRange, isUpcoming } from "@/lib/booking-format";
import {
  getRole,
  listHostBookings,
  listOwnerPlaces,
  type HostBooking,
  type OwnerPlace,
} from "@/lib/db/owner";
import { LISTING_STATUS_META } from "@/lib/listing-status";
import { formatSar } from "@/lib/money";
import { monthStats } from "@/lib/owner-stats";
import { BlockForm } from "./block-form";

export const metadata: Metadata = { title: "لوحة صاحب المكان", robots: { index: false } };

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[20px] leading-8 font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function OwnerPage(props: PageProps<"/owner">) {
  const { created } = await props.searchParams;
  const { supabase, user } = await requireUser("/owner");
  const profile = await getRole(supabase, user.id);

  if (profile?.role !== "host" && profile?.role !== "admin") {
    return (
      <>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-[640px] flex-1 px-4 py-14 sm:px-6">
          <div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-surface p-6">
            <h1 className="text-display-md font-bold">لوحة أصحاب الأماكن</h1>
            <p className="text-ink-muted">
              حسابك حساب عميل. لإضافة مكان، أنشئ حسابًا جديدًا واختر «أنا صاحب مكان» عند التسجيل.
            </p>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="min-h-11 cursor-pointer font-semibold text-brand hover:text-brand-hover"
              >
                سجّل خروج وأنشئ حساب مالك
              </button>
            </form>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  let places: OwnerPlace[] = [];
  let bookings: HostBooking[] = [];
  let failed = false;
  try {
    [places, bookings] = await Promise.all([
      listOwnerPlaces(supabase, user.id),
      listHostBookings(supabase),
    ]);
  } catch (err) {
    console.error(err);
    failed = true;
  }

  const stats = monthStats(
    bookings.map((b) => ({
      status: b.status,
      source: b.source,
      start: b.start,
      total: b.total,
      commission: b.commission,
    })),
  );
  const upcoming = bookings
    .filter((b) => b.status !== "cancelled" && isUpcoming(b.start))
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 12);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-body-sm text-ink-muted">{profile.full_name}</p>
            <h1 className="text-[clamp(28px,5vw,36px)] leading-[1.4] font-bold">
              لوحة صاحب المكان
            </h1>
          </div>
          <ButtonLink href="/owner/places/new">أضف مكانًا</ButtonLink>
        </div>

        {created && (
          <p role="status" className="mb-6 rounded-md bg-success-subtle px-4 py-3 text-success">
            {created === "pending"
              ? "تم إرسال المكان للمراجعة، ويظهر للعملاء بعد موافقة الإدارة."
              : "تم حفظ المكان كمسودة."}
          </p>
        )}
        {failed && (
          <p role="alert" className="mb-6 rounded-md bg-danger-subtle px-4 py-3 text-danger">
            تعذّر تحميل بيانات اللوحة. حاول تحديث الصفحة.
          </p>
        )}

        <div className="flex flex-col gap-6">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: "حجوزات هذا الشهر", v: String(stats.count) },
              { k: "قيمة الحجوزات", v: formatSar(stats.gross) },
              { k: "عمولة المنصة", v: formatSar(stats.commission) },
              { k: "صافي مستحقاتك", v: formatSar(stats.net), hi: true },
            ].map((s) => (
              <div
                key={s.k}
                className={
                  s.hi
                    ? "flex flex-col gap-1 rounded-lg border border-brand bg-brand-subtle p-4"
                    : "flex flex-col gap-1 rounded-lg border border-border bg-surface p-4"
                }
              >
                <dt className={s.hi ? "text-body-sm text-brand" : "text-body-sm text-ink-muted"}>
                  {s.k}
                </dt>
                <dd className={s.hi ? "text-[22px] font-bold text-brand" : "text-[22px] font-bold"}>
                  {s.v}
                </dd>
              </div>
            ))}
          </dl>

          <Panel title={`الحجوزات القادمة (${upcoming.length})`}>
            {upcoming.length === 0 ? (
              <p className="text-ink-muted">ما فيه حجوزات قادمة.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-md border border-border">
                {upcoming.map((b) => (
                  <li
                    key={b.reference}
                    className="flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-3"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <BookingId>{b.reference}</BookingId>
                        {b.source === "customer" ? (
                          <StatusBadge status={b.status} />
                        ) : (
                          <Badge tone="neutral">حظر</Badge>
                        )}
                      </div>
                      <span className="text-body-sm font-semibold">{b.placeTitle}</span>
                      <span className="text-body-sm text-ink-muted">
                        {formatBookingRange(b.start, b.end)}
                      </span>
                    </div>
                    {b.source === "customer" && (
                      <div className="flex flex-col items-end gap-0.5 text-body-sm">
                        <span>{b.customerName ?? "عميل"}</span>
                        {b.customerPhone && (
                          <a
                            dir="ltr"
                            href={`tel:${b.customerPhone}`}
                            className="text-brand hover:text-brand-hover"
                          >
                            {b.customerPhone}
                          </a>
                        )}
                        <span className="font-semibold">
                          {formatSar(b.total - b.commission)}
                          <span className="font-normal text-ink-muted"> صافي · {b.guests} شخص</span>
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={`أماكني (${places.length})`}>
            {places.length === 0 ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-ink-muted">ما أضفت أماكن بعد.</p>
                <ButtonLink href="/owner/places/new" variant="secondary">
                  أضف أول مكان
                </ButtonLink>
              </div>
            ) : (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                {places.map((p) => {
                  const meta = LISTING_STATUS_META[p.status];
                  return (
                    <li
                      key={p.id}
                      className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface"
                    >
                      <div className="relative h-[120px] bg-surface-overlay">
                        {p.cover && (
                          <Image
                            src={p.cover.src}
                            alt={p.cover.alt}
                            fill
                            sizes="300px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="flex flex-col gap-2 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold">{p.title}</span>
                          <Badge tone={meta.tone} dot>
                            {meta.label}
                          </Badge>
                        </div>
                        <span className="text-body-sm text-ink-muted">{p.city}</span>
                        {p.status === "published" && (
                          <Link
                            href={`/places/${p.slug}`}
                            className="text-body-sm font-semibold text-brand hover:text-brand-hover"
                          >
                            عرض صفحة المكان
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {places.length > 0 && (
            <Panel title="حظر فترة">
              <p className="text-body-sm text-ink-muted">
                للصيانة أو الاستخدام الخاص: الأيام المحظورة ما تظهر متاحة للحجز.
              </p>
              <BlockForm places={places.map((p) => ({ id: p.id, title: p.title }))} />
            </Panel>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
