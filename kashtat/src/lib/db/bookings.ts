import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookingStatus } from "@/lib/booking-status";
import type { RateUnit } from "@/lib/pricing";

export type MyBooking = {
  reference: string;
  status: BookingStatus;
  rateUnit: RateUnit;
  units: number;
  guests: number;
  start: string;
  end: string;
  total: number;
  base: number;
  addonsTotal: number;
  createdAt: string;
  place: {
    slug: string;
    title: string;
    city: string;
    address: string;
    lat: number;
    lng: number;
    cancellationPolicy: string;
  };
  addons: Array<{ name: string; amount: number }>;
};

type Row = {
  reference: string;
  status: BookingStatus;
  rate_unit: RateUnit;
  units: number | string;
  guests: number;
  booking_start: string;
  booking_end: string;
  total_amount: number;
  base_amount: number;
  addons_amount: number;
  created_at: string;
  places: {
    slug: string;
    title_ar: string;
    address_text: string;
    latitude: number;
    longitude: number;
    cancellation_policy_ar: string;
    cities: { name_ar: string } | null;
  } | null;
  booking_addons: Array<{ name_ar: string; line_total: number }>;
};

const COLUMNS =
  "reference, status, rate_unit, units, guests, booking_start, booking_end, total_amount, base_amount, addons_amount, created_at, places(slug, title_ar, address_text, latitude, longitude, cancellation_policy_ar, cities(name_ar)), booking_addons(name_ar, line_total)";

function toBooking(r: Row): MyBooking {
  return {
    reference: r.reference,
    status: r.status,
    rateUnit: r.rate_unit,
    units: Number(r.units),
    guests: r.guests,
    start: r.booking_start,
    end: r.booking_end,
    total: r.total_amount,
    base: r.base_amount,
    addonsTotal: r.addons_amount,
    createdAt: r.created_at,
    place: {
      slug: r.places?.slug ?? "",
      title: r.places?.title_ar ?? "",
      city: r.places?.cities?.name_ar ?? "",
      address: r.places?.address_text ?? "",
      lat: r.places?.latitude ?? 0,
      lng: r.places?.longitude ?? 0,
      cancellationPolicy: r.places?.cancellation_policy_ar ?? "",
    },
    addons: r.booking_addons.map((a) => ({ name: a.name_ar, amount: a.line_total })),
  };
}

// RLS تقصر النتائج على حجوزات المستخدم نفسه؛ الفلتر هنا لاستبعاد حجوزاته كمضيف
export async function listMyBookings(db: SupabaseClient, userId: string): Promise<MyBooking[]> {
  const { data, error } = await db
    .from("bookings")
    .select(COLUMNS)
    .eq("customer_id", userId)
    .order("booking_start", { ascending: false })
    .returns<Row[]>();
  if (error) throw new Error(`listMyBookings: ${error.message}`);
  return data.map(toBooking);
}

export async function getMyBooking(
  db: SupabaseClient,
  userId: string,
  reference: string,
): Promise<MyBooking | null> {
  const { data, error } = await db
    .from("bookings")
    .select(COLUMNS)
    .eq("customer_id", userId)
    .eq("reference", reference)
    .maybeSingle<Row>();
  if (error) throw new Error(`getMyBooking: ${error.message}`);
  return data ? toBooking(data) : null;
}
