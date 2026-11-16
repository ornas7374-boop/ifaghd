import type { Metadata } from "next";
import { InsightsView } from "@/components/log/InsightsView";

export const metadata: Metadata = { title: "التحليل — عَزم" };

export default function InsightsPage() {
  return <InsightsView />;
}
