import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-surface-overlay", className)}
    />
  );
}

/** هيكل بطاقة مكان أثناء التحميل */
export function PlaceCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="جارٍ التحميل"
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4"
    >
      <Skeleton className="aspect-[4/3] w-full rounded-md" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-pill" />
        <Skeleton className="h-6 w-20 rounded-pill" />
      </div>
    </div>
  );
}
