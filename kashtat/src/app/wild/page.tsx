import type { Metadata } from "next";
import { loadTypePlaces, TypeLanding, typeMetadata } from "@/components/places/type-landing";
import { TYPE_PAGES } from "@/lib/type-content";

export const revalidate = 300;

const page = TYPE_PAGES.wild;

export async function generateMetadata(): Promise<Metadata> {
  return typeMetadata(page, await loadTypePlaces(page));
}

export default async function Page() {
  return <TypeLanding page={page} places={await loadTypePlaces(page)} />;
}
