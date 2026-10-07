import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SkeletonTableRows } from "@/client/components/SkeletonPresets";
import { Button } from "@/client/components/ui/button";
import { researchAiVisibilityPrompts } from "@/serverFunctions/ai-visibility";
import { normalizeAiSuggestion } from "@/shared/ai-prompt-suggestions";
import type { AiTrackerState } from "@/shared/ai-visibility";
import type { AiTrackerPatch } from "@/types/schemas/ai-visibility";
import { PromptResearchTable } from "./PromptResearchTable";
import { TrackerPatchReview } from "./TrackerPatchReview";
import { AiQueryError, aiVisibilityKey } from "./shared";

export function PromptResearchKeyword({
  projectId,
  state,
  keyword,
}: {
  projectId: string;
  state: AiTrackerState;
  keyword: string;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [change, setChange] = useState<{
    patch: AiTrackerPatch;
    description: string;
  } | null>(null);
  // The tracked prompts refresh tracked flags after any tracker edit. The
  // server reuses its cached provider response, so this costs no extra credits.
  const research = useQuery({
    queryKey: [
      ...aiVisibilityKey(projectId),
      "research",
      keyword,
      state.prompts.filter((prompt) => !prompt.archived).map(({ id }) => id),
    ],
    queryFn: () =>
      researchAiVisibilityPrompts({ data: { projectId, keyword } }),
    retry: false,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const track = () => {
    const topic =
      state.topics.find(
        (name) =>
          normalizeAiSuggestion(name) === normalizeAiSuggestion(keyword),
      ) ?? keyword;
    setChange({
      description: `Track ${selected.size} researched ${selected.size === 1 ? "prompt" : "prompts"} in the ${topic} topic.`,
      patch: { prompts: [...selected].map((text) => ({ text, topic })) },
    });
  };
  return (
    <div className="space-y-5 pt-1">
      <div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={
            <Link
              to="/p/$projectId/ai-visibility/research"
              params={{ projectId }}
            />
          }
        >
          <ArrowLeft /> Back
        </Button>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{keyword}</h1>
      <div className="overflow-hidden rounded-lg border bg-card border-border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 border-border">
          <h2 className="font-medium">Prompts</h2>
          <Button size="sm" disabled={!selected.size} onClick={track}>
            Track selected{selected.size ? ` (${selected.size})` : ""}
          </Button>
        </div>
        {research.isPending ? (
          <SkeletonTableRows rows={8} columns={4} className="p-4" />
        ) : research.isError ? (
          <AiQueryError
            error={research.error}
            retry={() => {
              void research.refetch();
            }}
          />
        ) : !research.data.prompts.length ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No prompts found for “{keyword}”. Try a shorter, broader term.
          </p>
        ) : (
          <PromptResearchTable
            prompts={research.data.prompts}
            selected={selected}
            onToggle={(text) => {
              const next = new Set(selected);
              if (!next.delete(text)) next.add(text);
              setSelected(next);
            }}
          />
        )}
      </div>
      {change && (
        <TrackerPatchReview
          projectId={projectId}
          state={state}
          patch={change.patch}
          description={change.description}
          onClose={() => setChange(null)}
          onSaved={(next) => {
            queryClient.setQueryData(
              [...aiVisibilityKey(projectId), "tracker"],
              next,
            );
            setChange(null);
            setSelected(new Set());
          }}
        />
      )}
    </div>
  );
}
