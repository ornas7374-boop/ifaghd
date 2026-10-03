import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/**
 * عميل للقراءة العامة بلا جلسة مستخدم: يُستخدم في الصفحات المخزّنة مؤقتًا.
 * الصلاحيات تحكمها سياسات RLS لدور anon.
 */
export function createPublicClient() {
  const { url, key } = supabaseEnv();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
