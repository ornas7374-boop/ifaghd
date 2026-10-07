import type { Metadata } from "next";
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
import { JsonLd } from "@/components/seo/json-ld";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getFeaturedPlaces, type PlaceCard } from "@/lib/db/places";
import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const siteLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: "ar-SA",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/places?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/favicon.ico"),
    image: absoluteUrl(DEFAULT_OG_IMAGE),
    areaServed: { "@type": "Country", name: "SA" },
  },
];

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
      <JsonLd data={siteLd} />
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
