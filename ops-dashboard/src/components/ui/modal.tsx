"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/format";

/** Focus-trapped modal. Scales 0.97 → 1 + fade. Esc / backdrop closes. */
export function Modal({
  open,
  onClose,
  children,
  label,
  className,
  position = "center",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  label: string;
  className?: string;
  position?: "center" | "top";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const restore = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restore.current = document.activeElement as HTMLElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    requestAnimationFrame(() => {
      const target = ref.current?.querySelector<HTMLElement>("[autofocus],input,button");
      target?.focus();
    });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
      restore.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className={cn("fixed inset-0 z-[80] flex justify-center px-4", position === "top" ? "items-start pt-[12vh]" : "items-center")}>
      <div className="anim-fade absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn("anim-pop relative w-full max-w-[520px] overflow-hidden rounded-[12px] border border-border-strong bg-surface shadow-[var(--shadow-pop)]", className)}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
