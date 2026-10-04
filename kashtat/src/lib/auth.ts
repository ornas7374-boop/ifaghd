import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

/** المسار الداخلي الآمن للعودة بعد تسجيل الدخول (يمنع التحويل لمواقع خارجية) */
export function safeNext(next: unknown, fallback = "/"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

/** المستخدم الحالي أو تحويل لصفحة الدخول مع العودة لنفس الصفحة */
export async function requireUser(nextPath: string) {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return { supabase, user: data.user };
}
