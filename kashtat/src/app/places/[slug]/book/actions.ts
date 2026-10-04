"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { bookingErrorMessage } from "@/lib/booking-errors";
import { createSupabaseServer } from "@/lib/supabase/server";

export type BookState = { error?: string };

const schema = z.object({
  placeId: z.uuid(),
  unit: z.enum(["hour", "day", "night"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration: z.coerce.number().int().min(1).max(30),
  guests: z.coerce.number().int().min(1).max(500),
  from: z
    .string()
    .regex(/^([01]\d|2[0-3]):00$/)
    .optional(),
  addons: z.array(z.uuid()).max(20),
});

/** السعر والتوفر تحسبهما قاعدة البيانات؛ لا نثق بأي مبلغ من المتصفح */
export async function confirmBooking(_: BookState, form: FormData): Promise<BookState> {
  const parsed = schema.safeParse({
    placeId: form.get("placeId"),
    unit: form.get("unit"),
    date: form.get("date"),
    duration: form.get("duration"),
    guests: form.get("guests"),
    from: form.get("from") || undefined,
    addons: form.getAll("addon"),
  });
  if (!parsed.success) return { error: "بيانات الحجز غير مكتملة، ارجع لصفحة المكان" };
  const b = parsed.data;

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("book_now", {
    p_place_id: b.placeId,
    p_rate_unit: b.unit,
    p_date: b.date,
    p_duration: b.duration,
    p_guests: b.guests,
    p_start_time: b.unit === "hour" ? `${b.from ?? "16:00"}:00` : null,
    p_addon_ids: b.addons,
  });
  if (error) return { error: bookingErrorMessage(error.message) };

  redirect(`/bookings/${(data as { reference: string }).reference}?new=1`);
}
