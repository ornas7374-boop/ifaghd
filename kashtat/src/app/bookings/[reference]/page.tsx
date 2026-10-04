import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { BookingId, StatusBadge } from "@/components/ui/badge";
import { CheckIcon } from "@/components/ui/icons";
import { requireUser } from "@/lib/auth";
import { formatBookingRange, isUpcoming } from "@/lib/booking-format";
import { UNIT_COUNT } from "@/lib/booking-window";
import { getMyBooking } from "@/lib/db/bookings";
import { formatSar } from "@/lib/money";
import { CancelButton } from "./cancel-button";

export const metadata: Metadata = { title: "تفاصيل الحجز", robots: { index: false } };

export default async function BookingPage(props: PageProps<"/bookings/[reference]">) {
  const { reference } = await props.params;
  const { new: isNew } = await props.searchParams;
  const { supabase, user } = await requireUser(`/bookings/${reference}`);
  const b = await getMyBooking(supabase, user.id, decodeURIComponent(reference));
  if (!b) notFound();

  const canCancel = ["pending", "confirmed"].includes(b.status) && isUpcoming(b.start);
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${b.place.lat},${b.place.lng}`;

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[720px] flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <nav aria-label="مسار التنقل" className="mb-4 text-body-sm text-ink-muted">
          <Link href="/bookings" className="hover:text-brand">
            → حجوزاتي
          </Link>
        </nav>

        {isNew === "1" && b.status === "confirmed" && (
          <div
            role="status"
            className="mb-6 flex items-start gap-3 rounded-lg border border-success bg-success-subtle p-4 text-success"
          >
            <CheckIcon className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">تم تأكيد حجزك</p>
              <p className="text-body-sm">احفظ رقم الحجز، وتقدر ترجع لتفاصيله من «حجوزاتي».</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-caption text-ink-muted">رقم الحجز</span>
              <span className="text-[20px]">
                <BookingId>{b.reference}</BookingId>
              </span>
            </div>
            <StatusBadge status={b.status} />
          </header>

          <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-5 sm:p-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-[22px] leading-8 font-bold">
                <Link href={`/places/${b.place.slug}`} className="hover:text-brand">
                  {b.place.title}
                </Link>
              </h1>
              <p className="text-body-sm text-ink-muted">{b.place.city}</p>
            </div>
            <p className="rounded-md bg-surface-overlay px-3 py-2 text-body-sm">
              {formatBookingRange(b.start, b.end)}
            </p>
            <dl className="flex flex-col gap-2 text-body-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-ink-muted">عدد الأشخاص</dt>
                <dd>{b.guests}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-muted">
                  {b.units} {UNIT_COUNT[b.rateUnit]}
                </dt>
                <dd>{formatSar(b.base)}</dd>
              </div>
              {b.addons.map((a) => (
                <div key={a.name} className="flex justify-between gap-2">
                  <dt className="text-ink-muted">{a.name}</dt>
                  <dd>{formatSar(a.amount)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-2 border-t border-border pt-3 text-label-lg font-bold">
                <dt>الإجمالي</dt>
                <dd>{formatSar(b.total)}</dd>
              </div>
            </dl>
          </section>

          {b.status !== "cancelled" && (
            <section className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
              <h2 className="font-semibold">الموقع</h2>
              <p className="text-body-sm text-ink-muted">{b.place.address}</p>
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start font-semibold text-brand hover:text-brand-hover"
              >
                افتح الموقع في الخرائط ↗
              </a>
            </section>
          )}

          {canCancel && (
            <div className="flex flex-col items-start gap-2">
              <CancelButton reference={b.reference} policy={b.place.cancellationPolicy} />
              <p className="text-caption text-ink-muted">{b.place.cancellationPolicy}</p>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
