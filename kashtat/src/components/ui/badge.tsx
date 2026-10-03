import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { BOOKING_STATUS_META, type BookingStatus, type StatusTone } from "@/lib/booking-status";

const tones: Record<StatusTone, string> = {
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
  info: "bg-info-subtle text-info",
  sand: "bg-sand-subtle text-sand",
  neutral: "bg-surface-overlay text-ink-muted",
};

const dots: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  sand: "bg-sand",
  neutral: "bg-ink-muted",
};

type BadgeProps = {
  tone?: StatusTone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
};

export function Badge({ tone = "neutral", dot, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-caption font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {dot && <span aria-hidden="true" className={cn("size-1.5 rounded-full", dots[tone])} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const meta = BOOKING_STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}

/** رقم الحجز: خط ثابت ودائمًا من اليسار لليمين */
export function BookingId({ children }: { children: string }) {
  return (
    <bdi dir="ltr" className="font-mono text-[13px] leading-5 font-medium text-ink">
      {children}
    </bdi>
  );
}
