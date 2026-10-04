import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { BookingId, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { formatBookingRange, isUpcoming } from "@/lib/booking-format";
import { listMyBookings, type MyBooking } from "@/lib/db/bookings";
import { formatSar } from "@/lib/money";

export const metadata: Metadata = { title: "حجوزاتي", robots: { index: false } };

function BookingRow({ b }: { b: MyBooking }) {
  return (
    <li>
      <Link
        href={`/bookings/${b.reference}`}
        className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4 transition-colors hover:border-border-strong sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <BookingId>{b.reference}</BookingId>
          <StatusBadge status={b.status} />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-label-lg font-bold">{b.place.title}</h3>
          <p className="text-body-sm text-ink-muted">
            {b.place.city} · {formatBookingRange(b.start, b.end)}
          </p>
        </div>
        <p className="font-semibold">{formatSar(b.total)}</p>
      </Link>
    </li>
  );
}

export default async function BookingsPage() {
  const { supabase, user } = await requireUser("/bookings");

  let bookings: MyBooking[] | null = null;
  try {
    bookings = await listMyBookings(supabase, user.id);
  } catch (err) {
    console.error(err);
  }

  const upcoming = bookings?.filter((b) => b.status !== "cancelled" && isUpcoming(b.start)) ?? [];
  const past = bookings?.filter((b) => !upcoming.includes(b)) ?? [];

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[860px] flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-[clamp(28px,5vw,36px)] leading-[1.4] font-bold">حجوزاتي</h1>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="min-h-11 cursor-pointer text-body-sm text-ink-muted hover:text-ink"
            >
              تسجيل الخروج
            </button>
          </form>
        </div>

        {bookings === null ? (
          <p role="alert" className="rounded-lg border border-border bg-surface p-6 text-ink-muted">
            تعذّر تحميل حجوزاتك الآن. حاول تحديث الصفحة.
          </p>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-surface p-6">
            <p className="font-semibold">ما عندك حجوزات للحين.</p>
            <ButtonLink href="/places">ابحث عن مكان</ButtonLink>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            <section aria-labelledby="upcoming-title" className="flex flex-col gap-4">
              <h2 id="upcoming-title" className="text-label-lg font-semibold">
                القادمة ({upcoming.length})
              </h2>
              {upcoming.length === 0 ? (
                <p className="text-ink-muted">ما فيه حجوزات قادمة.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {upcoming.map((b) => (
                    <BookingRow key={b.reference} b={b} />
                  ))}
                </ul>
              )}
            </section>
            {past.length > 0 && (
              <section aria-labelledby="past-title" className="flex flex-col gap-4">
                <h2 id="past-title" className="text-label-lg font-semibold">
                  السابقة والملغاة ({past.length})
                </h2>
                <ul className="flex flex-col gap-3">
                  {past.map((b) => (
                    <BookingRow key={b.reference} b={b} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
