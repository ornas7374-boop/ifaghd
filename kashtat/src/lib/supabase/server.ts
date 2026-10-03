import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

/** عميل بجلسة المستخدم الحالي (من الكوكيز): للصفحات والإجراءات التي تحتاج تسجيل دخول */
export async function createSupabaseServer() {
  const { url, key } = supabaseEnv();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // من Server Component لا يمكن كتابة الكوكيز؛ يتولاها proxy عند تحديث الجلسة
        }
      },
    },
  });
}
