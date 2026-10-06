"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col items-start gap-4 px-4 py-14 sm:px-6">
      <h1 className="text-display-md font-bold">تعذّر تحميل لوحة الإدارة</h1>
      <p className="text-ink-muted">صار خطأ أثناء جلب البيانات. حاول مرة ثانية.</p>
      <Button onClick={reset}>إعادة المحاولة</Button>
    </main>
  );
}
