import type { Metadata } from "next";
import { StuckFlow } from "@/components/stuck/StuckFlow";

export const metadata: Metadata = { title: "أنا عالق — عَزم" };

export default function StuckPage() {
  return <StuckFlow />;
}
