import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/SettingsView";

export const metadata: Metadata = { title: "الإعدادات — عَزم" };

export default function Page() {
  return <SettingsView />;
}
