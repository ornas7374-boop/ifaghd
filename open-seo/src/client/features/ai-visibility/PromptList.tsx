import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ExportMenu } from "@/client/components/ExportMenu";
import { DataTableToolbar } from "@/client/components/table/DataTableToolbar";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { exportAiVisibilityData } from "@/serverFunctions/ai-visibility";
import { safeHttpUrl } from "@/shared/safe-url";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import type { AiPrompt, AiRun, AiTrackerState } from "@/shared/ai-visibility";
import type { AiTrackerPatch } from "@/types/schemas/ai-visibility";
import { PromptInventory } from "./PromptInventory";
import {
  AiQueryError,
  aiVisibilityKey,
  fetchAllAiVisibilityResults,
} from "./shared";

export function PromptList({
  projectId,
  state,
  currentRun,
  onSetup,
  onEdit,
  onReduce,
  onReview,
  reducePending,
}: {
  projectId: string;
  state: AiTrackerState;
  currentRun: AiRun | null;
  onSetup: () => void;
  onEdit: (prompt: AiPrompt) => void;
  onReduce: (patch: AiTrackerPatch) => void;
  onReview: (patch: AiTrackerPatch, description: string) => void;
  reducePending: boolean;
}) {
  const [search, setSearch] = useState("");
  // Every answer in the run, so each prompt can show its per-engine result.
  const results = useQuery({
    queryKey: [...aiVisibilityKey(projectId), "results", "all", currentRun?.id],
    queryFn: async () => {
      const result = await fetchAllAiVisibilityResults({
        projectId,
        runId: currentRun?.id,
      });
      return result.rows;
    },
    enabled: Boolean(currentRun),
  });
  const exportMutation = useMutation({
    mutationFn: (format: "json" | "csv") =>
      exportAiVisibilityData({
        data: {
          projectId,
          runId: currentRun?.id,
          branded: "all",
          format,
        },
      }),
    onSuccess: (result) => {
      const url = safeHttpUrl(result.url);
      if (!url) {
        toast.error("The export link was invalid.");
        return;
      }
      const link = document.createElement("a");
      link.href = url;
      link.download = `ai-visibility.${result.format}`;
      link.rel = "noreferrer";
      link.click();
    },
    onError: (error) => toast.error(getStandardErrorMessage(error)),
  });
  // Archiving keeps a prompt's history for when it is added back; archived
  // prompts are not listed.
  const prompts = state.prompts.filter((prompt) => !prompt.archived);
  return (
    <>
      <DataTableToolbar
        actions={
          <>
            {currentRun && (
              <ExportMenu
                actions={["csv", "json"]}
                busy={exportMutation.isPending}
                onExport={(format) => exportMutation.mutate(format)}
              />
            )}
            <Button size="sm" onClick={onSetup}>
              <Plus />
              Add prompts
            </Button>
          </>
        }
      >
        <Input
          aria-label="Search tracked prompts"
          className="h-7 w-64"
          placeholder="Search prompts"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </DataTableToolbar>
      {results.isError && (
        <AiQueryError
          error={results.error}
          retry={() => {
            void results.refetch();
          }}
        />
      )}
      {currentRun && results.isPending && (
        <p className="px-4 py-2 text-xs text-muted-foreground" role="status">
          Loading latest results…
        </p>
      )}
      <PromptInventory
        projectId={projectId}
        prompts={prompts}
        topics={state.topics}
        search={search}
        engines={state.engines}
        rows={results.data}
        pending={reducePending}
        onEdit={onEdit}
        onReduce={onReduce}
        onReview={onReview}
      />
    </>
  );
}
