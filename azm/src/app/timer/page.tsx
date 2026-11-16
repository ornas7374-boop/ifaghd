import type { Metadata } from "next";
import { TimerView } from "@/components/timer/TimerView";

export const metadata: Metadata = { title: "المؤقت — عَزم" };

export default function TimerPage() {
  return <TimerView />;
}
