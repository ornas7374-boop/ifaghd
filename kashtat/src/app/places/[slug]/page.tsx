import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BookingBox } from "@/components/places/booking-box";
import { FavoriteButton } from "@/components/places/favorite-button";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { StarIcon, UsersIcon } from "@/components/ui/icons";
import { formatTime12 } from "@/lib/dates";
import { getPlaceBySlug, PLACE_KIND_LABEL, RATE_UNIT_LABEL, startingPrice } from "@/lib/db/places";
import { formatSar } from "@/lib/money";
import { parseSearchParams, type RawParams } from "@/lib/search-params";

// نفس الطلب يُستخدم في generateMetadata والصفحة
const loadPlace = cache(getPlaceBySlug);

const reviewDate = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  month: "long",
  year: "numeric",
});

export async function generateMetadata(props: PageProps<"/places/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const place = await loadPlace(slug).catch(() => null);
  if (!place) return { title: "المكان غير موجود" };
  return {
    title: `${place.title} · ${place.city.name}`,
    description: place.description.slice(0, 155),
  };
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 border-t border-border pt-8">
      <h2 id={id} className="text-[22px] leading-8 font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5 text-sand" role="img" aria-label={`${value} من 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} size={16} fill={i <= value ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

export default async function PlacePage(props: PageProps<"/places/[slug]">) {
  const { slug } = await props.params;
  const place = await loadPlace(slug);
  if (!place) notFound();

  const sp = parseSearchParams((await props.searchParams) as RawParams);
  const cheapest = startingPrice({
    price_per_hour: place.rates.hour,
    price_per_day: place.rates.day,
    price_per_night: place.rates.night,
  });
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${place.approx.lat},${place.approx.lng}`;

  return (
    <>
      <SiteHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-[1248px] flex-1 px-4 pt-8 pb-28 sm:px-6 sm:pt-12 lg:pb-12"
      >
        <nav aria-label="مسار التنقل" className="mb-5 text-body-sm text-ink-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-brand">
                الرئيسية
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={`/places?city=${place.city.slug}`} className="hover:text-brand">
                {place.city.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink">
              {place.title}
            </li>
          </ol>
        </nav>

        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="sand">{PLACE_KIND_LABEL[place.kind]}</Badge>
              {place.ratingCount > 0 && (
                <span className="inline-flex items-center gap-1 text-body-sm font-semibold">
                  <StarIcon size={16} fill="currentColor" className="text-sand" />
                  {place.rating.toFixed(1)}
                  <span className="font-normal text-ink-muted">({place.ratingCount} تقييم)</span>
                </span>
              )}
            </div>
            <h1 className="text-[clamp(28px,5vw,40px)] leading-[1.4] font-bold">{place.title}</h1>
            <p className="text-ink-muted">
              {place.city.name} · {place.address}
            </p>
          </div>
        </header>

        <div className="relative mb-10 grid h-[240px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-lg sm:h-[400px]">
          {place.images.length === 0 ? (
            <div className="col-span-4 row-span-2 flex items-center justify-center bg-surface-overlay text-body-sm text-ink-muted">
              صورة المكان
            </div>
          ) : (
            place.images.slice(0, 3).map((img, i) => (
              <div
                key={img.src}
                className={
                  i === 0
                    ? "relative col-span-4 row-span-2 bg-surface-overlay sm:col-span-3"
                    : "relative hidden bg-surface-overlay sm:block"
                }
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  priority={i === 0}
                  sizes={i === 0 ? "(max-width: 640px) 100vw, 900px" : "300px"}
                  className="object-cover"
                />
              </div>
            ))
          )}
          <FavoriteButton placeName={place.title} />
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[1fr_380px]">
          <div className="flex min-w-0 flex-col gap-8">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  k: "السعة",
                  v: `${place.capacityMin}–${place.capacityMax} شخص`,
                  icon: <UsersIcon size={18} />,
                },
                { k: "الدخول", v: formatTime12(place.checkIn) },
                { k: "الخروج", v: formatTime12(place.checkOut) },
                { k: "التجهيز بين الحجوزات", v: `${place.turnaroundMinutes} دقيقة` },
              ].map((d) => (
                <div
                  key={d.k}
                  className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3.5"
                >
                  <dt className="text-caption text-ink-muted">{d.k}</dt>
                  <dd className="flex items-center gap-1.5 font-semibold">
                    {d.icon}
                    {d.v}
                  </dd>
                </div>
              ))}
            </dl>

            <section aria-label="الوصف">
              <p className="text-body-lg whitespace-pre-line">{place.description}</p>
            </section>

            {place.amenities.length > 0 && (
              <Section id="amenities" title="المرافق">
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {place.amenities.map((a) => (
                    <li
                      key={a.slug}
                      className="flex min-h-11 items-center gap-2 rounded-md border border-border px-3"
                    >
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
                      {a.name}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section id="location" title="الموقع">
              <p className="text-ink-muted">
                {place.address}. الموقع الدقيق يوصلك بعد تأكيد الحجز.
              </p>
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start font-semibold text-brand hover:text-brand-hover"
              >
                شوف المنطقة التقريبية على الخريطة ↗
              </a>
            </Section>

            {(place.rules || place.cancellationPolicy) && (
              <Section id="policies" title="الشروط">
                <dl className="flex flex-col gap-4">
                  {place.cancellationPolicy && (
                    <div className="flex flex-col gap-1">
                      <dt className="font-semibold">سياسة الإلغاء</dt>
                      <dd className="text-ink-muted">{place.cancellationPolicy}</dd>
                    </div>
                  )}
                  {place.rules && (
                    <div className="flex flex-col gap-1">
                      <dt className="font-semibold">قواعد المكان</dt>
                      <dd className="whitespace-pre-line text-ink-muted">{place.rules}</dd>
                    </div>
                  )}
                </dl>
              </Section>
            )}

            <Section id="reviews" title="التقييمات">
              {place.reviews.length === 0 ? (
                <p className="text-ink-muted">ما فيه تقييمات مكتوبة بعد.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {place.reviews.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Stars value={r.rating} />
                        <time dateTime={r.createdAt} className="text-caption text-ink-muted">
                          {reviewDate.format(new Date(r.createdAt))}
                        </time>
                      </div>
                      <p>{r.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <aside
            id="booking"
            className="scroll-mt-[88px] lg:sticky lg:top-[88px]"
            aria-label="الحجز"
          >
            <BookingBox
              slug={place.slug}
              rates={place.rates}
              capacityMin={place.capacityMin}
              capacityMax={place.capacityMax}
              checkIn={place.checkIn}
              checkOut={place.checkOut}
              addons={place.addons}
              initial={{
                type: sp.type,
                date: sp.date,
                from: sp.from,
                duration: sp.duration,
                guests: sp.guests,
              }}
            />
          </aside>
        </div>
      </main>

      {/* شريط الحجز السفلي للجوال: صندوق الحجز في آخر الصفحة */}
      {cheapest && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-border bg-surface-raised px-4 py-3 lg:hidden">
          <p className="text-[18px] font-bold">
            {formatSar(cheapest.amount)}{" "}
            <span className="text-body-sm font-normal text-ink-muted">
              / {RATE_UNIT_LABEL[cheapest.unit]}
            </span>
          </p>
          <ButtonLink href="#booking">احجز الآن</ButtonLink>
        </div>
      )}
      <SiteFooter />
    </>
  );
}
