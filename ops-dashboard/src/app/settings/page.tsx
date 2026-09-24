import type { Metadata } from "next";
import { ComingNext } from "@/components/coming-next";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <ComingNext title="Settings" description="Workspace, team, integrations, billing and API keys." bullets={["General · Team · Integrations · Billing · API keys · Notifications", "Inline save states per field", "Theme toggle (available now in the account menu)"]} />;
}
