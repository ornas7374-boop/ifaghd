import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  runAiVisibilityCheck,
  saveAiVisibilityTracker,
} from "@/serverFunctions/ai-visibility";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import type { AiRun, AiTrackerState } from "@/shared/ai-visibility";
import type { TrackerSetupReviewData } from "./TrackerSetupReview";

export function useTrackerSetupSave({
  projectId,
  onSaved,
}: {
  projectId: string;
  onSaved: (state: AiTrackerState, run?: AiRun) => void;
}) {
  return useMutation({
    mutationFn: async ({
      accepted,
      runNow,
    }: {
      accepted: TrackerSetupReviewData;
      runNow: boolean;
    }) => {
      const result = await saveAiVisibilityTracker({
        data: { projectId, ...accepted.patch },
      });
      if (!runNow) return { state: result.state };
      try {
        // The server refuses the run if its cost rose above the reviewed estimate.
        const run = await runAiVisibilityCheck({
          data: { projectId, maxCostUsd: accepted.estimate.costUsd },
        });
        return { state: result.state, run };
      } catch (runError) {
        // Keep the successful save visible even if collection could not start.
        return { state: result.state, runError };
      }
    },
    onSuccess: (result) => {
      onSaved(result.state, result.run);
      if (result.runError)
        toast.error(
          `Tracking saved. We couldn't confirm the run started. Check its status before trying again. ${getStandardErrorMessage(result.runError)}`,
        );
    },
  });
}
