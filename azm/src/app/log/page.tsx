import type { Metadata } from "next";
import { LogView } from "@/components/log/LogView";

export const metadata: Metadata = { title: "سجل التسويف — عَزم" };

export default function LogPage() {
  return <LogView />;
}
