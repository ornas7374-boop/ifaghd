import { useState } from "react";
import { sort } from "remeda";
import { Button } from "@/client/components/ui/button";
import type { AiPrompt } from "@/shared/ai-visibility";
import { summarizeAiBrands } from "@/shared/ai-visibility-results";
import type { getAiVisibilityResults } from "@/serverFunctions/ai-visibility";
import { PromptAnswers } from "./PromptAnswers";
import {
  PromptDateRange,
  PromptRange,
  inPromptPeriod,
  promptPeriod,
} from "./PromptDateRange";
import { PromptExecutions } from "./PromptExecutions";
import { PromptSummary } from "./PromptSummary";

export function PromptAnalysis({
  projectId,
  prompt,
  history,
}: {
  projectId: string;
  prompt: AiPrompt | undefined;
  history: Awaited<ReturnType<typeof getAiVisibilityResults>>;
}) {
  const [period, setPeriod] = useState(() => promptPeriod());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const executions = sort(
    history.historyRuns.flatMap((run) =>
      history.rows
        .filter(
          (row) =>
            row.runId === run.id &&
            inPromptPeriod(row.collectedAt ?? run.createdAt, period),
        )
        .map((observation) => ({ observation, run })),
    ),
    (a, b) =>
      b.run.createdAt.localeCompare(a.run.createdAt) ||
      (b.observation.collectedAt ?? b.run.createdAt).localeCompare(
        a.observation.collectedAt ?? a.run.createdAt,
      ),
  );
  const selected =
    executions.find(({ observation }) => observation.id === selectedId) ??
    executions.find(
      ({ observation }) =>
        observation.status === "completed" &&
        observation.answerStatus === "answered",
    ) ??
    executions[0];
  const summaries = summarizeAiBrands(
    executions.map(({ observation }) => observation),
  );
  return (
    <div className="space-y-4">
      <PromptDateRange value={period} onChange={setPeriod} />
      <PromptSummary summaries={summaries} />
      {selected ? (
        <>
          <PromptExecutions
            executions={executions}
            selectedId={selected.observation.id}
            onSelect={setSelectedId}
          />
          <PromptAnswers
            projectId={projectId}
            prompt={prompt}
            observation={selected.observation}
            executionDate={
              selected.observation.collectedAt ?? selected.run.createdAt
            }
          />
        </>
      ) : (
        <div className="space-y-3 rounded-lg border border-border bg-card p-8 text-center">
          <h2 className="text-sm font-medium">
            {history.rows.length
              ? "No executions in this period"
              : "No answers yet"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {history.rows.length
              ? "Choose another date range to see this prompt’s answers."
              : "Choose Run now to collect answers, brand mentions, and citations."}
          </p>
          {history.rows.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPeriod(promptPeriod(PromptRange.All))}
            >
              Show all available history
            </Button>
          )}
        </div>
      )}
      {history.truncated && (
        <p className="text-xs text-muted-foreground">
          History covers the latest 50 project runs. Older executions are not
          included in this period’s metrics.
        </p>
      )}
    </div>
  );
}
