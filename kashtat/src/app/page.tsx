import { Hero } from "@/components/home/hero";
import {
  Categories,
  FeaturedPlaces,
  FinalCta,
  HourlyBooking,
  HowItWorks,
  Owners,
  Trust,
} from "@/components/home/sections";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getFeaturedPlaces, type PlaceCard } from "@/lib/db/places";

// تُحدَّث الصفحة من قاعدة البيانات كل 5 دقائق
export const revalidate = 300;

async function loadFeatured(): Promise<PlaceCard[] | null> {
  try {
    return await getFeaturedPlaces(4);
  } catch (err) {
    console.error(err);
    return null;
  }
}

export default async function Home() {
  const featured = await loadFeatured();
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-on-brand"
      >
        تخطَّ إلى المحتوى
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        <Hero />
        <Categories />
        <FeaturedPlaces places={featured} />
        <HowItWorks />
        <HourlyBooking />
        <Owners />
        <Trust />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
