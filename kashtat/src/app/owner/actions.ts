"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { randomImageSet } from "@/lib/images";
import { createSupabaseServer } from "@/lib/supabase/server";

// مراكز المدن: الموقع التقريبي للأماكن الجديدة (نسخة تدريبية بدون خريطة)
const CITY_CENTER: Record<string, [number, number]> = {
  riyadh: [24.71, 46.68],
  jeddah: [21.54, 39.17],
  dammam: [26.43, 50.1],
  abha: [18.22, 42.5],
  taif: [21.27, 40.42],
  tabuk: [28.38, 36.57],
  buraidah: [26.33, 43.97],
  hail: [27.52, 41.69],
};

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "وقت غير صالح");
const sar = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v)))
  .pipe(z.number().int().min(1, "السعر لازم يكون أكبر من صفر").max(100000).nullable());

const placeSchema = z
  .object({
    title: z.string().trim().min(3, "اسم المكان قصير").max(80),
    kind: z.enum(["kashta", "camp", "wild"], "اختر النوع"),
    city: z.string().refine((c) => c in CITY_CENTER, "اختر المدينة"),
    address: z.string().trim().min(3, "أدخل العنوان").max(120),
    description: z.string().trim().min(20, "اكتب وصفًا من 20 حرفًا على الأقل").max(1500),
    capacityMin: z.coerce.number("أدخل السعة").int().min(1, "السعة لازم تكون 1 على الأقل").max(500),
    capacityMax: z.coerce.number("أدخل السعة").int().min(1, "السعة لازم تكون 1 على الأقل").max(500),
    checkIn: time,
    checkOut: time,
    turnaround: z.coerce.number("أدخل وقت التجهيز").int().min(0).max(600, "وقت التجهيز طويل جدًا"),
    priceHour: sar,
    priceDay: sar,
    priceNight: sar,
    amenities: z.array(z.string().regex(/^[a-z-]{2,30}$/)).max(20),
    cancellation: z.string().trim().min(5, "اكتب سياسة الإلغاء").max(400),
    rules: z.string().trim().max(600),
    submit: z.enum(["draft", "pending"], "اختر حفظ أو إرسال"),
  })
  .refine((v) => v.capacityMax >= v.capacityMin, "السعة القصوى أقل من الدنيا")
  .refine((v) => v.priceHour || v.priceDay || v.priceNight, "حدد سعرًا واحدًا على الأقل");

// nonce يغيّر مفتاح النموذج بعد كل رد حتى تُعاد القيم المدخلة (React يعيد ضبط النموذج بعد الإرسال)
export type PlaceFormState = {
  error?: string;
  values?: Record<string, string | string[]>;
  nonce?: number;
};

export async function createPlace(_: PlaceFormState, form: FormData): Promise<PlaceFormState> {
  // الحقول الناقصة تصبح نصًا فارغًا فتظهر رسائل التحقق العربية بدل رسائل النظام
  const str = (k: string) => {
    const x = form.get(k);
    return typeof x === "string" ? x : "";
  };
  const raw = {
    title: str("title"),
    kind: str("kind"),
    city: str("city"),
    address: str("address"),
    description: str("description"),
    capacityMin: str("capacityMin"),
    capacityMax: str("capacityMax"),
    checkIn: str("checkIn"),
    checkOut: str("checkOut"),
    turnaround: str("turnaround"),
    priceHour: str("priceHour"),
    priceDay: str("priceDay"),
    priceNight: str("priceNight"),
    amenities: form.getAll("amenity").map(String),
    cancellation: str("cancellation"),
    rules: str("rules"),
    submit: str("submit"),
  };
  const values: Record<string, string | string[]> = raw;
  const nonce = Date.now();
  const parsed = placeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values, nonce };
  const p = parsed.data;

  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/owner/places/new");

  const [lat, lng] = CITY_CENTER[p.city];
  const jitter = () => (Math.random() - 0.5) * 0.2;
  const { data: city } = await supabase.from("cities").select("id").eq("slug", p.city).single();

  // القاعدة تفرض الحالة: المالك لا ينشر مباشرة (مسودة أو مراجعة)
  const { data: place, error } = await supabase
    .from("places")
    .insert({
      slug: `p-${crypto.randomUUID().slice(0, 8)}`,
      host_id: auth.user.id,
      title_ar: p.title,
      description_ar: p.description,
      place_kind: p.kind,
      status: p.submit,
      city_id: city!.id,
      address_text: p.address,
      latitude: lat + jitter(),
      longitude: lng + jitter(),
      capacity_min: p.capacityMin,
      capacity_max: p.capacityMax,
      check_in_time: p.checkIn,
      check_out_time: p.checkOut,
      turnaround_minutes: p.turnaround,
      price_per_hour: p.priceHour && p.priceHour * 100,
      price_per_day: p.priceDay && p.priceDay * 100,
      price_per_night: p.priceNight && p.priceNight * 100,
      cancellation_policy_ar: p.cancellation,
      rules_ar: p.rules || null,
    })
    .select("id, title_ar")
    .single();
  if (error) {
    console.error(error);
    return { error: "تعذّر حفظ المكان. تأكد أن حسابك حساب مالك.", values, nonce };
  }

  if (p.amenities.length) {
    const { data: rows } = await supabase.from("amenities").select("id").in("slug", p.amenities);
    if (rows?.length) {
      await supabase
        .from("place_amenities")
        .insert(rows.map((a) => ({ place_id: place.id, amenity_id: a.id })));
    }
  }

  // صور عشوائية من المجموعة الجاهزة بدل الرفع
  await supabase.from("listing_images").insert(
    randomImageSet().map((path, i) => ({
      place_id: place.id,
      storage_path: path,
      alt_ar: place.title_ar,
      sort_order: i + 1,
      is_cover: i === 0,
    })),
  );

  revalidatePath("/owner");
  redirect(`/owner?created=${p.submit}`);
}

const blockSchema = z.object({
  placeId: z.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "اختر التاريخ"),
  days: z.coerce.number().int().min(1).max(14),
});

export type BlockState = { error?: string; done?: string };

/** حظر أيام كاملة (صيانة أو استخدام خاص): يمنع الحجز في هذه الفترة */
export async function blockDays(_: BlockState, form: FormData): Promise<BlockState> {
  const parsed = blockSchema.safeParse({
    placeId: form.get("placeId"),
    date: form.get("date"),
    days: form.get("days"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { placeId, date, days } = parsed.data;

  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "سجّل دخولك أولًا" };

  const start = new Date(`${date}T00:00:00+03:00`);
  const end = new Date(start.getTime() + days * 86_400_000);
  const { error } = await supabase.from("bookings").insert({
    reference: `BLK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    place_id: placeId,
    host_id: auth.user.id,
    source: "host_block",
    status: "confirmed",
    rate_unit: "day",
    units: days,
    guests: 1,
    booking_start: start.toISOString(),
    booking_end: end.toISOString(),
    total_amount: 0,
  });
  if (error) {
    if (error.code === "23P01") return { error: "الفترة فيها حجز قائم، اختر أيامًا أخرى" };
    console.error(error);
    return { error: "تعذّر حظر الفترة" };
  }
  revalidatePath("/owner");
  return { done: `تم حظر ${days} ${days === 1 ? "يوم" : "أيام"} من ${date}` };
}
