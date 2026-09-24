"use client";

import { cn } from "@/lib/format";

export function Toggle({ checked, onChange, label, size = "md" }: { checked: boolean; onChange: (v: boolean) => void; label: string; size?: "sm" | "md" }) {
  const sm = size === "sm";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full border transition-colors duration-200",
        sm ? "h-4 w-7" : "h-5 w-9",
        checked ? "border-transparent bg-accent-solid" : "border-border-strong bg-surface-2",
      )}
    >
      <span
        className={cn(
          "inline-block rounded-full bg-white shadow-sm transition-transform duration-200 ease-out-expo",
          sm ? "size-3" : "size-3.5",
          checked ? (sm ? "translate-x-[13px]" : "translate-x-[18px]") : "translate-x-[2px]",
        )}
      />
    </button>
  );
}
