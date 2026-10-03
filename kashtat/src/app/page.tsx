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

export default function Home() {
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
        <FeaturedPlaces />
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
