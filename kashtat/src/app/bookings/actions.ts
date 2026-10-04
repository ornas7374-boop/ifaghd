"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { bookingErrorMessage } from "@/lib/booking-errors";
import { createSupabaseServer } from "@/lib/supabase/server";

export type CancelState = { error?: string; done?: boolean };

export async function cancelBooking(_: CancelState, form: FormData): Promise<CancelState> {
  const ref = z
    .string()
    .regex(/^[A-Z0-9-]{4,40}$/)
    .safeParse(form.get("reference"));
  if (!ref.success) return { error: "رقم حجز غير صالح" };

  const supabase = await createSupabaseServer();
  // الدالة تتحقق أن الحجز لصاحب الجلسة وأن موعده لم يبدأ
  const { error } = await supabase.rpc("cancel_my_booking", { p_reference: ref.data });
  if (error) return { error: bookingErrorMessage(error.message) };

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${ref.data}`);
  return { done: true };
}
