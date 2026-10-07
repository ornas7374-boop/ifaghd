import { createFileRoute } from "@tanstack/react-router";
import { PromptHistoryPage } from "@/client/features/ai-visibility/PromptHistoryPage";

export const Route = createFileRoute(
  "/_app/p/$projectId/ai-visibility/prompts/$promptId",
)({ component: AiPromptHistoryRoute });

function AiPromptHistoryRoute() {
  const { projectId, promptId } = Route.useParams();
  return (
    <PromptHistoryPage
      key={`${projectId}:${promptId}`}
      projectId={projectId}
      promptId={promptId}
    />
  );
}
