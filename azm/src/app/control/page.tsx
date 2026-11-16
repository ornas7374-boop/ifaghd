import type { Metadata } from "next";
import { ControlView } from "@/components/control/ControlView";

export const metadata: Metadata = { title: "في يدي / ليس في يدي — عَزم" };

export default function Page() {
  return <ControlView />;
}
