import { ButtonLink } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

// مؤقتة حتى المرحلة 2 (الصفحة الرئيسية من التصميم)
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-start justify-center gap-6 px-4 py-16 sm:px-6">
      <div className="flex w-full items-center justify-between">
        <p className="text-[26px] leading-9 font-bold">الكشتات</p>
        <ThemeToggle />
      </div>
      <h1 className="text-[clamp(40px,6vw,64px)] leading-[1.25] font-bold">
        كشتتك الجاية،
        <br />
        محجوزة بضغطة.
      </h1>
      <p className="max-w-[480px] text-body-lg text-ink-muted">
        الصفحة الرئيسية الكاملة تُبنى في المرحلة 2. راجع المكوّنات الآن من دليل المكوّنات.
      </p>
      <ButtonLink href="/styleguide" size="lg">
        دليل المكوّنات
      </ButtonLink>
    </main>
  );
}
