import { useEffect, useRef, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import { WebsiteResearchProgress } from "@/client/features/projects/WebsiteResearchProgress";
import { WebsiteSetupReview } from "@/client/features/projects/WebsiteSetupReview";
import {
  getAiResearchSetup,
  startAiResearchSetup,
} from "@/serverFunctions/ai-visibility";
import { saveProjectWebsiteSetup } from "@/serverFunctions/projectWebsite";
import type { SaveProjectWebsiteSetup } from "@/types/schemas/projectWebsite";
import { SkeletonPageContent } from "@/client/components/SkeletonPresets";
import { AiQueryError, aiVisibilityKey } from "./shared";

/**
 * AI visibility needs research keywords. A project with a website but no
 * keywords confirms the spend here, then the server runs setup once: website
 * research and the onboarding competitor review when the overview or
 * competitors are missing, otherwise one keyword and prompt generation. The
 * run lives on the server, so leaving or reloading the page finds it again.
 * Both paths end on Prompt Tracking.
 */
export function AiResearchSetupGate({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const setupKey = [...aiVisibilityKey(projectId), "researchSetup"];
  const setup = useQuery({
    queryKey: setupKey,
    queryFn: () => getAiResearchSetup({ data: { projectId } }),
    refetchInterval: (query) =>
      query.state.data?.status === "running" ? 3000 : false,
  });
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: aiVisibilityKey(projectId) }),
      queryClient.invalidateQueries({
        queryKey: ["projectContext", projectId],
      }),
      queryClient.invalidateQueries({
        queryKey: projectsQueryOptions().queryKey,
      }),
    ]);
  const start = useMutation({
    mutationFn: () => startAiResearchSetup({ data: { projectId } }),
    onSuccess: (data) => queryClient.setQueryData(setupKey, data),
  });
  const save = useMutation({
    mutationFn: (accepted: Omit<SaveProjectWebsiteSetup, "projectId">) =>
      saveProjectWebsiteSetup({ data: { ...accepted, projectId } }),
    onSuccess: refresh,
  });
  const status = setup.data?.status;
  // Once the setup step settled is seen here, ready lands on the generated
  // topics and prompts. Keyword generation refreshes AI visibility queries.
  const settingUp = useRef(false);
  useEffect(() => {
    if (status && status !== "ready") settingUp.current = true;
    else if (status === "ready" && settingUp.current) {
      settingUp.current = false;
      void refresh();
      void navigate({
        to: "/p/$projectId/ai-visibility",
        params: { projectId },
      });
    }
    // refresh and navigate are stable enough; only status transitions matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  if (setup.isPending) return <SkeletonPageContent />;
  if (setup.isError)
    return (
      <AiQueryError
        error={setup.error}
        retry={() => {
          void setup.refetch();
        }}
      />
    );
  if (status === "ready") return children;
  if (setup.data.review)
    return (
      <div className="grid min-h-[calc(100dvh-8rem)] place-items-center">
        <WebsiteSetupReview
          projectId={projectId}
          research={setup.data.review}
          saving={save.isPending}
          error={save.isError}
          onSave={(accepted) => save.mutate(accepted)}
        />
      </div>
    );
  if (status === "running" || start.isPending)
    return (
      <div className="grid min-h-[calc(100dvh-8rem)] place-items-center">
        <WebsiteResearchProgress
          missingOverview={setup.data.missingOverview}
          missingCompetitors={setup.data.missingCompetitors}
          note="You can leave this page; setup keeps running."
        />
      </div>
    );
  const failed = status === "failed" || start.isError;
  const unreadable =
    !start.isError && setup.data.failure === "website_unreadable";
  return (
    <div className="grid min-h-[calc(100dvh-8rem)] place-items-center">
      <Card className="w-full max-w-2xl py-6 md:py-8">
        <CardContent className="space-y-6 px-6 md:px-8">
          <div>
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border bg-muted">
              <Sparkles className="size-5" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Set up AI visibility
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              We’ll research your brand and find the most relevant topics to
              monitor.
            </p>
          </div>
          {failed && (
            <Alert variant="destructive">
              <AlertDescription>
                {unreadable
                  ? "We couldn’t read this website. Check the URL in project settings, then try again."
                  : "We couldn’t finish setting up AI visibility. Check your available usage credits, then try again."}
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-3">
            <Button size="lg" className="w-full" onClick={() => start.mutate()}>
              {failed ? "Try again" : "Start research"}
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Research uses a small amount of usage credits.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
