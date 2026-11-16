import type { Metadata } from "next";
import { ConstitutionView } from "@/components/constitution/ConstitutionView";

export const metadata: Metadata = { title: "دستوري الشخصي — عَزم" };

export default function Page() {
  return <ConstitutionView />;
}
