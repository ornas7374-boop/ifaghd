"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";
import { Kbd } from "./kbd";

/**
 * Linear-style detail panel: 480px, slides in 16px + fade from the right.
 * Doesn't block the page (no backdrop on desktop) — you can keep scanning the
 * list and click another row to swap the record.
 */
export function SidePanel({ open, onClose, label, header, children, footer }: { open: boolean; onClose: () => void; label: string; header: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    ref.current?.focus();
    document.body.dataset.panel = "open"; // lets toasts move out of the panel's way
    return () => {
      delete document.body.dataset.panel;
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <>
      <div className="anim-fade fixed inset-0 z-[60] bg-[var(--overlay)] md:hidden" onClick={onClose} aria-hidden />
      <aside
        ref={ref}
        tabIndex={-1}
        role="complementary"
        aria-label={label}
        className="anim-slide-right fixed inset-y-0 right-0 z-[70] flex w-full max-w-[480px] flex-col border-l border-border-strong bg-surface shadow-[var(--shadow-pop)] outline-none md:inset-y-2 md:right-2 md:rounded-[12px] md:border"
      >
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border pl-4 pr-2">
          <div className="min-w-0 flex-1">{header}</div>
          <span className="hidden sm:inline-flex">
            <Kbd keys={["Esc"]} />
          </span>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close panel">
            <X strokeWidth={1.5} />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3">{footer}</div>}
      </aside>
    </>,
    document.body,
  );
}
