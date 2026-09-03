"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "تأكيد الحذف",
  onConfirm,
  onCancel,
  busy,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden />
      <div
        role="alertdialog"
        aria-modal
        className="relative w-full max-w-sm rounded-2xl border border-hairline bg-surface p-6 shadow-2xl"
      >
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-critical/12 text-critical">
          <AlertTriangle size={22} />
        </div>
        <h2 className="font-bold text-ink">{title}</h2>
        {description && <p className="mt-1.5 text-sm text-ink-secondary">{description}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-2"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="rounded-xl bg-critical px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "جارٍ الحذف…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
