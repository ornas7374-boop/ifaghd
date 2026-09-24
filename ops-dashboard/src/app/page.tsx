import { Suspense } from "react";
import { Overview } from "@/components/overview/overview";

export default function OverviewPage() {
  return (
    <Suspense>
      <Overview />
    </Suspense>
  );
}
