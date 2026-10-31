import type { Metadata } from "next";
import { ReviewView } from "@/components/review/ReviewView";

export const metadata: Metadata = { title: "المحاسبة الأسبوعية — عَزم" };

export default function ReviewPage() {
  return <ReviewView />;
}
