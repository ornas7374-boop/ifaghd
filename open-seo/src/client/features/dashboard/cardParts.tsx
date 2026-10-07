import { buttonVariants } from "@/client/components/ui/button";
import { Skeleton } from "@/client/components/ui/skeleton";

// Shared building blocks for the dashboard cards.
export function StatGridSkeleton({
  tileClassName = "h-20",
}: {
  tileClassName?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3" aria-busy>
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className={tileClassName} />
      ))}
    </div>
  );
}

export function EmptyCardBody({
  message,
  cta,
}: {
  message: string;
  cta: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <p className="text-sm text-muted-foreground">{message}</p>
      <div className="mt-auto flex justify-end">{cta}</div>
    </div>
  );
}

export const moreDetailsClass = buttonVariants({
  variant: "ghost",
  size: "xs",
});

export function newLost(value: number | null): string {
  return value === null ? "—" : String(value);
}

export function formatDay(timestamp: string): string {
  const ms = Date.parse(
    // SQLite's current_timestamp default has no timezone marker; treat it as
    // UTC rather than letting the browser parse it as local time.
    /^\d{4}-\d{2}-\d{2} /.test(timestamp)
      ? `${timestamp.replace(" ", "T")}Z`
      : timestamp,
  );
  if (Number.isNaN(ms)) return timestamp;
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
