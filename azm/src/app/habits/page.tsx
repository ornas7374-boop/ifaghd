import type { Metadata } from "next";
import { HabitsView } from "@/components/habits/HabitsView";

export const metadata: Metadata = { title: "العادات — عَزم" };

export default function HabitsPage() {
  return <HabitsView />;
}
