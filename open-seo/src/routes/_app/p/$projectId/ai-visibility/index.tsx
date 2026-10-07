import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PromptTrackingPage } from "@/client/features/ai-visibility/PromptTrackingPage";
import { PROMPT_TRACKING_TABS } from "@/client/features/ai-visibility/PromptTrackingTabs";

const tabs = PROMPT_TRACKING_TABS.map((item) => item.value);

export const Route = createFileRoute("/_app/p/$projectId/ai-visibility/")({
  validateSearch: z.object({
    tab: z.enum(tabs).optional().catch(undefined),
  }),
  component: PromptTrackingRoute,
});

function PromptTrackingRoute() {
  const { projectId } = Route.useParams();
  const { tab } = Route.useSearch();
  return (
    <PromptTrackingPage
      key={projectId}
      projectId={projectId}
      tab={tab ?? "prompts"}
    />
  );
}
