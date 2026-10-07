import { SkeletonTableRows } from "@/client/components/SkeletonPresets";
import { Card } from "@/client/components/ui/card";
import { Skeleton } from "@/client/components/ui/skeleton";

export function DomainOverviewLoadingState() {
  return (
    <Card className="gap-0 py-0" aria-busy>
      <div className="px-4 pt-4 pb-3">
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="px-4 pb-4">
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 md:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-7 w-24" />
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="space-y-4 rounded-xl border border-border p-4">
          <Skeleton className="h-6 w-48" />
          <SkeletonTableRows />
        </div>
      </div>
    </Card>
  );
}
