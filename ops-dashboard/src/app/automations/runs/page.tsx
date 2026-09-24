import type { Metadata } from "next";
import { ComingNext } from "@/components/coming-next";

export const metadata: Metadata = { title: "Run history" };

export default function Page() {
  return <ComingNext title="Run history" description="Every execution across all workflows." bullets={["Filter by workflow, status and duration", "Retry single or bulk failed runs", "Link through to run logs"]} />;
}
