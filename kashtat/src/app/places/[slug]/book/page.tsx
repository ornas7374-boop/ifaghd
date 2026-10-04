import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { describeWindow, UNIT_COUNT } from "@/lib/booking-window";
import { fromDateKey, startOfDay } from "@/lib/dates";
import { getPlaceBySlug } from "@/lib/db/places";
import { formatSar } from "@/lib/money";
import { quote } from "@/lib/pricing";
import { parseSearchParams, type RawParams } from "@/lib/search-params";
import { ConfirmForm } from "./confirm-form";

export const metadata: Metadata = { title: "تأكيد الحجز", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Problem({ slug, message }: { slug: string; message: string }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-surface p-6">
      <p role="alert" className="font-semibold">
        {message}
      </p>
      <ButtonLink href={`/places/${slug}`} variant="secondary">
        ارجع لصفحة المكان
      </ButtonLink>
    </div>
  );
}

export default async function BookPage(props: PageProps<"/places/[slug]/book">) {
  const { slug } = await props.params;
  const raw = (await props.searchParams) as RawParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) for (const x of [v].flat()) if (x) qs.append(k, x);

  const { user, supabase } = await requireUser(`/places/${slug}/book?${qs}`);
  const place = await getPlaceBySlug(slug);
  if (!place) notFound();

  const p = parseSearchParams(raw);
  const addonIds = [raw.addon ?? []].flat().filter((id): id is string => UUID.test(id));
  const date = p.date ? fromDateKey(p.date) : null;
  const unit = p.type;
  const duration = p.duration ?? (unit === "hour" ? 4 : 1);
  const guests = p.guests ?? place.capacityMin;

  let problem: string | null = null;
  if (!unit || place.rates[unit] == null) problem = "اختر نوع حجز متاح لهذا المكان";
  else if (!date || date < startOfDay(new Date())) problem = "اختر تاريخًا قادمًا";
  else if (guests < place.capacityMin || guests > place.capacityMax)
    problem = `عدد الأشخاص لازم يكون من ${place.capacityMin} إلى ${place.capacityMax}`;

  const picked = place.addons.filter((a) => addonIds.includes(a.id));
  const q =
    !problem && unit ? quote({ rates: place.rates, unit, duration, guests, addons: picked }) : null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[720px] flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <nav aria-label="مسار التنقل" className="mb-4 text-body-sm text-ink-muted">
          <Link
            href={`/places/${place.slug}${p.type ? `?${qs}` : ""}`}
            className="hover:text-brand"
          >
            → {place.title}
          </Link>
        </nav>
        <h1 className="mb-6 text-[clamp(28px,5vw,36px)] leading-[1.4] font-bold">تأكيد الحجز</h1>

        {problem || !q || !unit || !date ? (
          <Problem slug={place.slug} message={problem ?? "تعذّر حساب السعر"} />
        ) : (
          <div className="flex flex-col gap-5">
            <section
              aria-label="ملخص الحجز"
              className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-5 sm:p-6"
            >
              <div className="flex flex-col gap-1">
                <h2 className="text-[20px] font-bold">{place.title}</h2>
                <p className="text-body-sm text-ink-muted">{place.city.name}</p>
              </div>
              <p className="rounded-md bg-surface-overlay px-3 py-2 text-body-sm">
                {describeWindow({
                  unit,
                  date,
                  duration,
                  from: p.from,
                  checkIn: place.checkIn,
                  checkOut: place.checkOut,
                })}
              </p>
              <dl className="flex flex-col gap-2 text-body-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-muted">عدد الأشخاص</dt>
                  <dd>{guests}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-muted">
                    {formatSar(q.rate)} × {duration} {UNIT_COUNT[unit]}
                  </dt>
                  <dd>{formatSar(q.base)}</dd>
                </div>
                {q.addons.map((a) => (
                  <div key={a.id} className="flex justify-between gap-2">
                    <dt className="text-ink-muted">{a.name}</dt>
                    <dd>{formatSar(a.amount)}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-2 border-t border-border pt-3 text-label-lg font-bold">
                  <dt>الإجمالي</dt>
                  <dd>{formatSar(q.total)}</dd>
                </div>
              </dl>
            </section>

            <section
              aria-label="بيانات الحاجز"
              className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-5 text-body-sm"
            >
              <p className="font-semibold">{profile?.full_name ?? "—"}</p>
              <p dir="ltr" className="text-end text-ink-muted">
                {user.email}
                {profile?.phone ? ` · ${profile.phone}` : ""}
              </p>
            </section>

            <p className="rounded-md bg-info-subtle px-4 py-3 text-body-sm text-info">
              نسخة تجريبية بدون دفع: الحجز يتأكد مباشرة، والسعر النهائي تحسبه المنصة عند التأكيد.
            </p>
            <p className="text-body-sm text-ink-muted">
              <span className="font-semibold text-ink">سياسة الإلغاء: </span>
              {place.cancellationPolicy}
            </p>

            <ConfirmForm
              fields={{
                placeId: place.id,
                unit,
                date: p.date,
                duration: String(duration),
                guests: String(guests),
                from: unit === "hour" ? (p.from ?? "16:00") : undefined,
                addon: picked.map((a) => a.id),
              }}
            />
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
