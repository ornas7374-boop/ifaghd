"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

// nonce يعيد بناء النموذج بعد كل رد حتى تبقى القيم المدخلة
export type AuthState = {
  error?: string;
  info?: string;
  fields?: Record<string, string>;
  nonce?: number;
};

const signInSchema = z.object({
  email: z.email("أدخل بريدًا إلكترونيًا صحيحًا"),
  password: z.string().min(1, "أدخل كلمة المرور"),
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "أدخل اسمك").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^05\d{8}$/, "رقم الجوال يبدأ بـ 05 ويتكون من 10 أرقام")
    .or(z.literal("")),
  email: z.email("أدخل بريدًا إلكترونيًا صحيحًا"),
  password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل"),
  isHost: z.boolean(),
});

// رسائل Supabase الشائعة بالعربي
function authMessage(code: string | undefined, fallback: string) {
  switch (code) {
    case "invalid_credentials":
      return "البريد أو كلمة المرور غير صحيحة";
    case "email_not_confirmed":
      return "أكّد بريدك أولًا من الرابط اللي وصلك";
    case "user_already_exists":
    case "email_exists":
      return "هذا البريد مسجّل. سجّل دخولك بدلًا من ذلك";
    case "weak_password":
      return "كلمة المرور ضعيفة، اختر أقوى";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "محاولات كثيرة، حاول بعد قليل";
    default:
      return fallback;
  }
}

function field(form: FormData, name: string) {
  const v = form.get(name);
  return typeof v === "string" ? v : "";
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const fields = { email: field(form, "email") };
  const parsed = signInSchema.safeParse({ email: fields.email, password: field(form, "password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields, nonce: Date.now() };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error)
    return {
      error: authMessage(error.code, "تعذّر تسجيل الدخول، حاول مرة ثانية"),
      fields,
      nonce: Date.now(),
    };

  redirect(safeNext(form.get("next"), "/bookings"));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const fields = {
    fullName: field(form, "fullName"),
    phone: field(form, "phone"),
    email: field(form, "email"),
  };
  const parsed = signUpSchema.safeParse({
    ...fields,
    password: field(form, "password"),
    isHost: form.get("isHost") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields, nonce: Date.now() };

  const next = safeNext(form.get("next"), "/bookings");
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // عميل أو مالك فقط (القاعدة ترفض طلب دور المدير)، ولا يمكن تغييره لاحقًا من الحساب
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        role: parsed.data.isHost ? "host" : "customer",
      },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error)
    return {
      error: authMessage(error.code, "تعذّر إنشاء الحساب، حاول مرة ثانية"),
      fields,
      nonce: Date.now(),
    };

  // إن كان تأكيد البريد مفعّلًا لا توجد جلسة بعد
  if (!data.session) {
    return { info: `أرسلنا رابط التأكيد إلى ${parsed.data.email}. افتحه لتفعيل حسابك.`, fields };
  }
  redirect(next);
}
