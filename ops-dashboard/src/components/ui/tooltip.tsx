import { cn } from "@/lib/format";

/**
 * CSS-only tooltip (hover + keyboard focus). Zero JS, zero layout cost —
 * good enough for icon buttons and hints. Put it inside a `group` element.
 */
export function Tip({ children, side = "bottom", align = "center", className }: { children: React.ReactNode; side?: "bottom" | "top" | "right"; align?: "center" | "end"; className?: string }) {
  const pos = {
    bottom: align === "end" ? "top-full right-0 mt-1.5" : "top-full left-1/2 mt-1.5 -translate-x-1/2",
    top: "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
    right: "left-full top-1/2 ml-2 -translate-y-1/2",
  }[side];
  return (
    <span
      role="tooltip"
      className={cn(
        "pointer-events-none absolute z-50 flex max-sm:hidden items-center gap-2 whitespace-nowrap rounded-[6px] border border-border-strong bg-surface-2 px-2 py-1 text-[11.5px] font-medium text-fg opacity-0 shadow-[var(--shadow-pop)] transition-opacity delay-0 duration-100 group-hover:opacity-100 group-hover:delay-300 group-focus-visible:opacity-100",
        pos,
        className,
      )}
    >
      {children}
    </span>
  );
}
