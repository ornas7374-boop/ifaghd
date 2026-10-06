"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Role = "customer" | "host" | "admin";

// وجهة الزر حسب نوع الحساب
const DEST: Record<Role, { href: string; label: string }> = {
  customer: { href: "/bookings", label: "حجوزاتي" },
  host: { href: "/owner", label: "لوحتي" },
  admin: { href: "/admin", label: "الإدارة" },
};

/**
 * حالة الدخول تُقرأ في المتصفح حتى تبقى الصفحات العامة مخزّنة مؤقتًا (بدون كوكيز على الخادم).
 */
export function AuthNav() {
  const [state, setState] = useState<{ signedIn: boolean | null; role: Role }>({
    signedIn: null,
    role: "customer",
  });

  useEffect(() => {
    const db = supabaseBrowser();
    const load = async (userId: string | undefined) => {
      if (!userId) return setState({ signedIn: false, role: "customer" });
      // RLS: المستخدم يقرأ ملفه فقط
      const { data } = await db.from("profiles").select("role").eq("id", userId).maybeSingle();
      setState({ signedIn: true, role: (data?.role as Role) ?? "customer" });
    };
    // أول حدث (INITIAL_SESSION) يحمل الجلسة الحالية، فلا حاجة لاستدعاء getSession منفصل
    const { data } = db.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "SIGNED_OUT") {
        void load(session?.user.id);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (state.signedIn) {
    const d = DEST[state.role];
    return (
      <ButtonLink href={d.href} variant="secondary">
        {d.label}
      </ButtonLink>
    );
  }
  return (
    <ButtonLink href="/login" variant="secondary" aria-busy={state.signedIn === null || undefined}>
      تسجيل الدخول
    </ButtonLink>
  );
}
