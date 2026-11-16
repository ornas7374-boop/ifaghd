"use client";

import { useEffect, useState, type ReactNode } from "react";

// حذف بلمستين بدل نافذة تأكيد مزعجة على الجوال.
export function ConfirmButton({ onConfirm, label, children }: { onConfirm: () => void; label: string; children: ReactNode }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(id);
  }, [armed]);

  return (
    <button
      type="button"
      aria-label={armed ? `تأكيد: ${label}` : label}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      className={`grid min-h-10 min-w-10 place-items-center rounded-full px-2 text-sm transition ${
        armed ? "bg-sos text-sos-fg" : "text-muted hover:text-fg"
      }`}
    >
      {armed ? "متأكد؟" : children}
    </button>
  );
}
