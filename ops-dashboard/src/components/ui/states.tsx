import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/format";

/** Resend-style empty state: small glossy icon, one sentence, one CTA. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      <div className="relative mb-4 flex size-10 items-center justify-center rounded-[10px] border border-border-strong bg-gradient-to-b from-surface-2 to-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_24px_-8px_rgba(0,0,0,0.5)]">
        <Icon className="size-[18px] text-muted" strokeWidth={1.5} />
      </div>
      <p className="text-[13px] font-medium text-fg">{title}</p>
      <p className="mt-1 max-w-[280px] text-[12.5px] text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry, compact }: { message: string; onRetry: () => void; compact?: boolean }) {
  return (
    <div role="alert" className={cn("flex items-center gap-3 rounded-[8px] border border-danger/20 bg-danger/[0.06] px-3", compact ? "py-2" : "py-3")}>
      <AlertTriangle className="size-4 shrink-0 text-danger" strokeWidth={1.5} />
      <p className="min-w-0 flex-1 text-[12.5px] text-fg">
        <span className="font-medium">Couldn&apos;t load data.</span> <span className="text-muted">{message}</span>
      </p>
      <Button size="sm" onClick={onRetry}>
        <RotateCw strokeWidth={1.5} />
        Retry
      </Button>
    </div>
  );
}
