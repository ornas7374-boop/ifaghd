import { Loader2 } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { DialogFooter } from "@/client/components/ui/dialog";
import { aiMarketLabel, type AiCostEstimate } from "@/shared/ai-visibility";
import { EngineLabel } from "./EngineLabel";
import type { AiTrackerPatch } from "@/types/schemas/ai-visibility";
import { AiQueryError, aiMoney } from "./shared";

export type TrackerSetupReviewData = {
  patch: AiTrackerPatch;
  estimate: AiCostEstimate;
};

export function TrackerSetupReview({
  review,
  enabled,
  pending,
  error,
  canRun,
  running,
  onBack,
  onSave,
  onSaveAndRun,
}: {
  review: TrackerSetupReviewData;
  enabled: boolean;
  pending: boolean;
  error: unknown;
  canRun: boolean;
  running: boolean;
  onBack: () => void;
  onSave: () => void;
  onSaveAndRun: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review your changes before saving.{" "}
        {enabled ? "These settings apply to your enabled schedule." : ""}
      </p>
      <dl className="grid grid-cols-2 gap-4 rounded-lg border p-4 text-sm border-border">
        {review.patch.engines && (
          <div>
            <dt className="text-muted-foreground">Engines</dt>
            <dd className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {review.patch.engines?.map((engine) => (
                <EngineLabel key={engine} engine={engine} />
              ))}
            </dd>
          </div>
        )}
        {review.patch.prompts !== undefined && (
          <div>
            <dt className="text-muted-foreground">New prompts</dt>
            <dd className="mt-1">{review.patch.prompts?.length ?? 0}</dd>
          </div>
        )}
        {review.patch.prompts?.[0]?.topic && (
          <div>
            <dt className="text-muted-foreground">Topic</dt>
            <dd className="mt-1">{review.patch.prompts[0].topic}</dd>
          </div>
        )}
        {review.patch.locationCode && review.patch.languageCode && (
          <div>
            <dt className="text-muted-foreground">Market</dt>
            <dd className="mt-1">
              {aiMarketLabel({
                locationCode: review.patch.locationCode,
                languageCode: review.patch.languageCode,
              })}
            </dd>
          </div>
        )}
      </dl>
      {!!review.patch.prompts?.length && (
        <div
          className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-4 border-border"
          data-ph-mask
        >
          <h3 className="text-sm font-semibold">Prompts to add</h3>
          {review.patch.prompts.map((prompt) => (
            <p
              key={prompt.text}
              className="whitespace-pre-wrap text-[0.8125rem] leading-relaxed"
            >
              {prompt.text}
            </p>
          ))}
        </div>
      )}
      <div className="space-y-1 rounded-lg bg-muted/60 p-4 text-sm">
        <p>
          Each run collects <strong>{review.estimate.observations}</strong>{" "}
          {review.estimate.observations === 1 ? "answer" : "answers"} for{" "}
          <strong>{aiMoney(review.estimate.costUsd)}</strong>
        </p>
        <p>
          <strong>{aiMoney(review.estimate.monthlyCostUsd)}</strong> estimated
          per month if it runs {review.estimate.scheduleInterval}.
        </p>
      </div>
      {!!error && <AiQueryError error={error} />}
      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={onBack}
        >
          Back to editing
        </Button>
        <Button
          type="button"
          variant={enabled ? "default" : "secondary"}
          disabled={pending}
          onClick={onSave}
        >
          {pending && !running && <Loader2 className="size-4 animate-spin" />}
          {enabled ? "Save reviewed changes" : "Save as paused"}
        </Button>
        {!enabled && (
          <Button
            type="button"
            disabled={pending || !canRun || review.estimate.observations === 0}
            onClick={onSaveAndRun}
          >
            {pending && running && <Loader2 className="size-4 animate-spin" />}
            Save and run now
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}
