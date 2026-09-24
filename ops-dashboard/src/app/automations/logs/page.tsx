import type { Metadata } from "next";
import { ComingNext } from "@/components/coming-next";

export const metadata: Metadata = { title: "Logs" };

export default function Page() {
  return <ComingNext title="Logs" description="Live, filterable execution logs." bullets={["Monospace stream with level colors", "Filter by level, workflow, and text", "Auto-scroll toggle + pause on hover"]} />;
}
