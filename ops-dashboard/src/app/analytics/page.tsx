import type { Metadata } from "next";
import { ComingNext } from "@/components/coming-next";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return <ComingNext title="Analytics" description="Sales, funnel and channel performance." bullets={["Revenue by channel, top products, funnel, payment mix", "Per-card period selector + export PNG/CSV", "Cohort retention for subscriptions"]} />;
}
