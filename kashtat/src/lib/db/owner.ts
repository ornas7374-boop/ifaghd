import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookingStatus } from "@/lib/booking-status";
import { toImages, type ImageRow, type PlaceImage } from "@/lib/images";
import type { ListingStatus } from "@/lib/listing-status";

export type OwnerPlace = {
  id: string;
  slug: string;
  title: string;
  status: ListingStatus;
  city: string;
  cover: PlaceImage | null;
};

export type HostBooking = {
  reference: string;
  status: BookingStatus;
  source: "customer" | "host_block" | "maintenance";
  placeSlug: string;
  placeTitle: string;
  start: string;
  end: string;
  guests: number;
  total: number;
  commission: number;
  customerName: string | null;
  customerPhone: string | null;
};

export async function getRole(db: SupabaseClient, userId: string) {
  const { data } = await db
    .from("profiles")
    .select("role, full_name")
    .eq("id", userId)
    .maybeSingle();
  return data as { role: "customer" | "host" | "admin"; full_name: string } | null;
}

export async function listOwnerPlaces(db: SupabaseClient, userId: string): Promise<OwnerPlace[]> {
  const { data, error } = await db
    .from("places")
    .select(
      "id, slug, title_ar, status, cities(name_ar), listing_images(storage_path, alt_ar, is_cover, sort_order)",
    )
    .eq("host_id", userId)
    .order("created_at", { ascending: false })
    .returns<
      Array<{
        id: string;
        slug: string;
        title_ar: string;
        status: ListingStatus;
        cities: { name_ar: string } | null;
        listing_images: ImageRow[];
      }>
    >();
  if (error) throw new Error(`listOwnerPlaces: ${error.message}`);
  return data.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title_ar,
    status: p.status,
    city: p.cities?.name_ar ?? "",
    cover: toImages(p.listing_images, p.title_ar)[0] ?? null,
  }));
}

export async function listHostBookings(db: SupabaseClient): Promise<HostBooking[]> {
  const { data, error } = await db.rpc("host_bookings");
  if (error) throw new Error(`listHostBookings: ${error.message}`);
  return (data as Array<Record<string, unknown>>).map((r) => ({
    reference: r.reference as string,
    status: r.status as BookingStatus,
    source: r.source as HostBooking["source"],
    placeSlug: r.place_slug as string,
    placeTitle: r.place_title as string,
    start: r.booking_start as string,
    end: r.booking_end as string,
    guests: r.guests as number,
    total: Number(r.total_amount),
    commission: Number(r.commission_amount),
    customerName: (r.customer_name as string | null) ?? null,
    customerPhone: (r.customer_phone as string | null) ?? null,
  }));
}
