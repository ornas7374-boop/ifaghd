import type { Metadata } from "next";
import { ComingNext } from "@/components/coming-next";

export const metadata: Metadata = { title: "Customers" };

export default function Page() {
  return <ComingNext title="Customers" description="Profiles, lifetime value and order history." bullets={["Segments: VIP, at-risk, first-time buyers", "LTV, order count, last order, city columns", "Customer detail panel with timeline"]} />;
}
