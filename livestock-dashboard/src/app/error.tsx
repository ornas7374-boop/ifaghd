"use client";

import { AlertOctagon } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-hairline bg-surface px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-critical/12 text-critical">
        <AlertOctagon size={26} />
      </div>
      <p className="font-semibold text-ink">حدث خطأ غير متوقع</p>
      <p className="max-w-sm text-sm text-ink-secondary">
        تعذر تحميل هذه الصفحة. يمكنك إعادة المحاولة، وإذا استمرت المشكلة تواصل مع الدعم الفني.
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-xl bg-[var(--series-1)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
