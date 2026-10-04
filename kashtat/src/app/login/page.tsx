import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { safeNext } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
  robots: { index: false },
};

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined, "/bookings");
  const mode = sp.mode === "signup" ? "signup" : "signin";
  const failed = sp.error === "callback";

  return (
    <>
      <SiteHeader />
      <main
        id="main"
        className="mx-auto flex w-full max-w-[440px] flex-1 flex-col gap-6 px-4 py-12 sm:py-20"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-display-md font-bold">أهلًا فيك</h1>
          <p className="text-ink-muted">سجّل دخولك عشان تكمل الحجز وتتابع حجوزاتك.</p>
        </div>
        {failed && (
          <p
            role="alert"
            className="rounded-md bg-danger-subtle px-4 py-3 text-body-sm text-danger"
          >
            رابط التأكيد غير صالح أو منتهي. سجّل دخولك أو اطلب رابطًا جديدًا.
          </p>
        )}
        <div className="rounded-lg border border-border bg-surface-raised p-5 sm:p-6">
          <LoginForm next={next} initialMode={mode} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
