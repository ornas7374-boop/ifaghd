"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CloseIcon } from "./icons";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  children?: ReactNode;
};

const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

/** نافذة مبنية على <dialog> الأصلي: حبس التركيز وEsc من المتصفح */
export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  size = "md",
  children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // نقرة على الخلفية تغلق النافذة
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-32px)] rounded-lg border border-border bg-surface-raised p-0 text-ink shadow-md",
        widths[size],
      )}
    >
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-display-md font-bold">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-body-sm text-ink-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="-me-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-overlay hover:text-ink"
          >
            <CloseIcon />
          </button>
        </div>
        {children}
        {footer && <div className="flex flex-wrap justify-end gap-2 pt-2">{footer}</div>}
      </div>
    </dialog>
  );
}
