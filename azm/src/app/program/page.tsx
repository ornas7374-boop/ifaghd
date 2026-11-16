import type { Metadata } from "next";
import { ProgramView } from "@/components/program/ProgramView";

export const metadata: Metadata = { title: "برنامج الـ30 يوم — عَزم" };

export default function ProgramPage() {
  return <ProgramView />;
}
