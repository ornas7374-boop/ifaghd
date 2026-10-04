import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { requireUser } from "@/lib/auth";
import { getRole } from "@/lib/db/owner";
import { getAmenities, getCities } from "@/lib/db/places";
import { PlaceForm } from "./place-form";

export const metadata: Metadata = { title: "أضف مكانًا", robots: { index: false } };

export default async function NewPlacePage() {
  const { supabase, user } = await requireUser("/owner/places/new");
  const profile = await getRole(supabase, user.id);
  const [cities, amenities] = await Promise.all([getCities(), getAmenities()]);
  const allowed = profile?.role === "host" || profile?.role === "admin";

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[760px] flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <nav aria-label="مسار التنقل" className="mb-4 text-body-sm text-ink-muted">
          <Link href="/owner" className="hover:text-brand">
            → لوحة صاحب المكان
          </Link>
        </nav>
        <h1 className="mb-2 text-[clamp(28px,5vw,36px)] leading-[1.4] font-bold">أضف مكانًا</h1>
        <p className="mb-8 text-ink-muted">المكان يظهر للعملاء بعد مراجعة الإدارة وموافقتها.</p>
        {allowed ? (
          <PlaceForm cities={cities} amenities={amenities} />
        ) : (
          <p role="alert" className="rounded-lg border border-border bg-surface p-6">
            إضافة الأماكن متاحة لحسابات أصحاب الأماكن فقط.{" "}
            <Link href="/owner" className="font-semibold text-brand">
              اعرف كيف
            </Link>
          </p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
