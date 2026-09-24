import type { Metadata } from "next";
import { ComingNext } from "@/components/coming-next";

export const metadata: Metadata = { title: "Workflows" };

export default function Page() {
  return <ComingNext title="Workflows" description="Every automation, its trigger and live health." bullets={["Workflow cards with status dot, success rate and on/off toggle", "Run history table with filters", "Detail panel (already live — try ⌘K → ZATCA)"]} />;
}
