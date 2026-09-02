import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-16 w-72" />
      <Skeleton className="h-14" />
      <Skeleton className="h-96" />
    </div>
  );
}
