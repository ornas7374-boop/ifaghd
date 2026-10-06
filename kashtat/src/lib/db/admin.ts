import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookingStatus } from "@/lib/booking-status";
import type { ListingStatus } from "@/lib/listing-status";

export type AdminReport = {
  months: Array<{ month: string; count: number; gross: number; commission: number }>;
  cities: Array<{ city: string; count: number; gross: number }>;
  totals: { count: number; gross: number; commission: number };
  cancelled: number;
  places: Partial<Record<ListingStatus, number>>;
  users: Partial<Record<"customer" | "host" | "admin", number>>;
};

export async function getAdminReport(db: SupabaseClient): Promise<AdminReport> {
  const { data, error } = await db.rpc("admin_report");
  if (error) throw new Error(`admin_report: ${error.message}`);
  return data as AdminReport;
}

export type AdminPlace = {
  id: string;
  slug: string;
  title: string;
  status: ListingStatus;
  city: string;
  host: string;
  createdAt: string;
};

export async function listAdminPlaces(
  db: SupabaseClient,
  status?: ListingStatus,
): Promise<AdminPlace[]> {
  let q = db
    .from("places")
    .select(
      "id, slug, title_ar, status, created_at, cities(name_ar), host:profiles!places_host_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) q = q.eq("status", status);
  const { data, error } = await q.returns<
    Array<{
      id: string;
      slug: string;
      title_ar: string;
      status: ListingStatus;
      created_at: string;
      cities: { name_ar: string } | null;
      host: { full_name: string } | null;
    }>
  >();
  if (error) throw new Error(`listAdminPlaces: ${error.message}`);
  return data.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title_ar,
    status: p.status,
    city: p.cities?.name_ar ?? "",
    host: p.host?.full_name ?? "",
    createdAt: p.created_at,
  }));
}

export type AdminUser = {
  id: string;
  email: string | null;
  name: string;
  phone: string | null;
  role: "customer" | "host" | "admin";
  createdAt: string;
};

export async function listAdminUsers(db: SupabaseClient): Promise<AdminUser[]> {
  const { data, error } = await db.rpc("admin_users");
  if (error) throw new Error(`admin_users: ${error.message}`);
  return (data as Array<Record<string, unknown>>).map((u) => ({
    id: u.id as string,
    email: (u.email as string | null) ?? null,
    name: u.full_name as string,
    phone: (u.phone as string | null) ?? null,
    role: u.role as AdminUser["role"],
    createdAt: u.created_at as string,
  }));
}

export type AdminBooking = {
  reference: string;
  status: BookingStatus;
  source: string;
  start: string;
  end: string;
  total: number;
  commission: number;
  place: string;
  customer: string | null;
};

export async function listAdminBookings(db: SupabaseClient): Promise<AdminBooking[]> {
  const { data, error } = await db
    .from("bookings")
    .select(
      "reference, status, source, booking_start, booking_end, total_amount, commission_amount, places(title_ar), customer:profiles!bookings_customer_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<
      Array<{
        reference: string;
        status: BookingStatus;
        source: string;
        booking_start: string;
        booking_end: string;
        total_amount: number;
        commission_amount: number;
        places: { title_ar: string } | null;
        customer: { full_name: string } | null;
      }>
    >();
  if (error) throw new Error(`listAdminBookings: ${error.message}`);
  return data.map((b) => ({
    reference: b.reference,
    status: b.status,
    source: b.source,
    start: b.booking_start,
    end: b.booking_end,
    total: b.total_amount,
    commission: b.commission_amount,
    place: b.places?.title_ar ?? "",
    customer: b.customer?.full_name ?? null,
  }));
}

export type AdminReview = {
  id: string;
  rating: number;
  body: string;
  hidden: boolean;
  createdAt: string;
  place: string | null;
  author: string | null;
};

export async function listAdminReviews(db: SupabaseClient): Promise<AdminReview[]> {
  const { data, error } = await db
    .from("reviews")
    .select(
      "id, rating, body_ar, is_hidden, created_at, places(title_ar), author:profiles!reviews_author_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<
      Array<{
        id: string;
        rating: number;
        body_ar: string;
        is_hidden: boolean;
        created_at: string;
        places: { title_ar: string } | null;
        author: { full_name: string } | null;
      }>
    >();
  if (error) throw new Error(`listAdminReviews: ${error.message}`);
  return data.map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body_ar,
    hidden: r.is_hidden,
    createdAt: r.created_at,
    place: r.places?.title_ar ?? null,
    author: r.author?.full_name ?? null,
  }));
}
