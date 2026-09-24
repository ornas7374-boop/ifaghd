import { cn } from "@/lib/format";
import type { StatusTone } from "@/lib/data/types";

const dot: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-neutral",
};
const badge: Record<StatusTone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
  neutral: "bg-neutral/12 text-muted",
};

/** 8px status dot. `pulse` = in-progress (running, deploying, syncing). */
export function StatusDot({ tone, pulse, className, label }: { tone: StatusTone; pulse?: boolean; className?: string; label?: string }) {
  return (
    <span className={cn("relative inline-flex size-2 shrink-0", className)} role={label ? "img" : undefined} aria-label={label}>
      {pulse && <span className={cn("pulse-ring absolute inset-0 rounded-full", dot[tone])} />}
      <span className={cn("relative inline-flex size-2 rounded-full", dot[tone])} />
    </span>
  );
}

export function Badge({ tone = "neutral", children, dot: withDot = true, className }: { tone?: StatusTone; children: React.ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center gap-1.5 rounded-[5px] px-1.5 text-[11.5px] font-medium capitalize", badge[tone], className)}>
      {withDot && <span className={cn("size-1.5 rounded-full", dot[tone])} />}
      {children}
    </span>
  );
}
