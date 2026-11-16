import type { Metadata } from "next";
import { PlansView } from "@/components/plans/PlansView";

export const metadata: Metadata = { title: "خطط إذا–فإن — عَزم" };

export default function PlansPage() {
  return <PlansView />;
}
