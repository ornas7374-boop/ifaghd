"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/browser";

/**
 * حالة الدخول تُقرأ في المتصفح حتى تبقى الصفحات العامة مخزّنة مؤقتًا (بدون كوكيز على الخادم).
 */
export function AuthNav() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const auth = supabaseBrowser().auth;
    auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  if (signedIn) {
    return (
      <ButtonLink href="/bookings" variant="secondary">
        حجوزاتي
      </ButtonLink>
    );
  }
  return (
    <ButtonLink href="/login" variant="secondary" aria-busy={signedIn === null || undefined}>
      تسجيل الدخول
    </ButtonLink>
  );
}
