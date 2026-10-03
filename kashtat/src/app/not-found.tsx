import { ButtonLink } from "@/components/ui/button";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1248px] flex-1 flex-col items-start gap-5 px-4 py-24 sm:px-6">
        <span className="font-mono text-[56px] leading-[64px] font-bold text-brand num3d">404</span>
        <h1 className="text-display-md font-bold">الصفحة غير موجودة</h1>
        <p className="max-w-[480px] text-body-lg text-ink-muted">
          يمكن الرابط تغيّر، أو الصفحة لسا تحت التجهيز.
        </p>
        <ButtonLink href="/" size="lg">
          الرجوع للرئيسية
        </ButtonLink>
      </main>
      <SiteFooter />
    </>
  );
}
