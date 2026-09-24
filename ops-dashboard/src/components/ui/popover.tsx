"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/format";

/**
 * Minimal accessible popover/dropdown. Handles outside-click, Esc (restores
 * focus to the trigger) and ↑/↓ roving focus across [role=menuitem*] children.
 */
export function Popover({
  trigger,
  children,
  align = "end",
  side = "bottom",
  className,
  role = "menu",
  label,
}: {
  trigger: (props: { open: boolean; toggle: () => void; id: string; ref: React.RefCallback<HTMLButtonElement> }) => React.ReactNode;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  align?: "start" | "end";
  side?: "bottom" | "top";
  className?: string;
  role?: "menu" | "dialog" | "listbox";
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  // Trigger element lives in state (not a ref) so `close` can be handed to render props.
  const [triggerEl, setTrigger] = useState<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    triggerEl?.focus();
  }, [triggerEl]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node) && !triggerEl?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    // focus first item for keyboard users
    requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('[role^="menuitem"],[role="option"],button,input')?.focus();
    });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, close, triggerEl]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])') ?? []);
    if (!items.length) return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next].focus();
  };

  return (
    <div className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o), id, ref: setTrigger })}
      {open && (
        <div
          ref={panelRef}
          id={id}
          role={role}
          aria-label={label}
          onKeyDown={onKeyDown}
          className={cn(
            "anim-drop absolute z-50 min-w-[200px] rounded-[10px] border border-border-strong bg-surface-2 p-1 shadow-[var(--shadow-pop)]",
            align === "end" ? "right-0" : "left-0",
            side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5",
            className,
          )}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  icon: Icon,
  children,
  hint,
  onSelect,
  danger,
  checked,
}: {
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  children: React.ReactNode;
  hint?: React.ReactNode;
  onSelect?: () => void;
  danger?: boolean;
  checked?: boolean;
}) {
  return (
    <button
      type="button"
      role={checked === undefined ? "menuitem" : "menuitemradio"}
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "flex h-8 w-full items-center gap-2.5 rounded-[6px] px-2 text-left text-[13px] outline-none transition-colors duration-100 hover:bg-hover focus-visible:bg-hover focus-visible:outline-none",
        danger ? "text-danger" : "text-fg",
      )}
    >
      {Icon && <Icon className="size-4 shrink-0 text-muted" strokeWidth={1.5} />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {checked && <span className="size-1.5 rounded-full bg-accent" />}
      {hint}
    </button>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-border" />;
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2 pb-1 pt-1.5 text-[11px] font-medium text-dim">{children}</div>;
}
