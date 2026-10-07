import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AiResearchSetupGate } from "@/client/features/ai-visibility/AiResearchSetupGate";
import { ProjectWebsiteGate } from "@/client/features/projects/ProjectWebsiteGate";

export const Route = createFileRoute("/_app/p/$projectId/ai-visibility")({
  component: AiVisibilityLayout,
});

function AiVisibilityLayout() {
  const { projectId } = Route.useParams();
  return (
    <div className="overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-5" key={projectId}>
        <ProjectWebsiteGate projectId={projectId}>
          <AiResearchSetupGate projectId={projectId}>
            <Outlet />
          </AiResearchSetupGate>
        </ProjectWebsiteGate>
      </div>
    </div>
  );
}
