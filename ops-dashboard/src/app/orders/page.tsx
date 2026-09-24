import type { Metadata } from "next";
import { ComingNext } from "@/components/coming-next";

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  return <ComingNext title="Orders" description="Every order across your store, Instagram, WhatsApp and TikTok." bullets={["Saved views (All · Unfulfilled · Needs refund) + filter chips", "Sortable, virtualized table with bulk actions bar", "Detail panel (already live — open one from ⌘K)"]} />;
}
