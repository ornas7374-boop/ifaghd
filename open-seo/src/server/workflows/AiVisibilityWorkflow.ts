import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { pgStep } from "./pgStep";
import {
  collectAiRound,
  finalizeAiRun,
  markAiRunFailed,
  postAiBatch,
  prepareAiRun,
  type AiPendingTask,
} from "@/server/features/ai-visibility/services/aiVisibilityCollection";
import { runAiResearchSetup } from "@/server/features/ai-visibility/services/aiResearchKeywords";
import type { BillingCustomerContext } from "@/server/billing/subscription";

// One binding serves answer collection runs and the one-time research setup,
// so setup needs no new workflow infrastructure.
type AiVisibilityPayload = ({ runId: string } | { setupProjectId: string }) & {
  customer: BillingCustomerContext;
};

// Metered and paid steps run once: a retry could post (and bill) twice.
const SINGLE_ATTEMPT = {
  retries: { limit: 0, delay: "1 second" as const },
  timeout: "2 minutes" as const,
};
// task_get is free and saving an answer replaces its evidence, so collect
// steps can retry.
const COLLECT_STEP = {
  retries: { limit: 2, delay: "10 seconds" as const },
  timeout: "5 minutes" as const,
};
// Standard-queue answers usually arrive within minutes. Cumulative waits are
// 2 / 4 / 7 / 10 / 15 / 20 / 30 / 45 / 60 minutes; anything still missing then
// fails as not collected.
const POLL_INTERVALS = [
  "2 minutes",
  "2 minutes",
  "3 minutes",
  "3 minutes",
  "5 minutes",
  "5 minutes",
  "10 minutes",
  "15 minutes",
  "15 minutes",
] as const;

export class AiVisibilityWorkflow extends WorkflowEntrypoint<
  Env,
  AiVisibilityPayload
> {
  async run(event: WorkflowEvent<AiVisibilityPayload>, step: WorkflowStep) {
    const { payload } = event;
    if ("setupProjectId" in payload)
      // No retries: each attempt is a paid model call. The user can retry.
      return pgStep(
        step,
        "research-setup",
        { retries: { limit: 0, delay: "1 second" }, timeout: "5 minutes" },
        () =>
          runAiResearchSetup(
            { projectId: payload.setupProjectId },
            payload.customer,
          ),
      );
    const { runId, customer } = payload;
    try {
      const { market, batches } = await pgStep(
        step,
        "prepare",
        SINGLE_ATTEMPT,
        () => prepareAiRun(runId, customer),
      );
      let pending: AiPendingTask[] = [];
      for (const [index, batch] of batches.entries())
        pending.push(
          ...(await pgStep(step, `post-${index}`, SINGLE_ATTEMPT, () =>
            postAiBatch(runId, customer, market, batch),
          )),
        );
      for (
        let round = 0;
        round < POLL_INTERVALS.length && pending.length > 0;
        round++
      ) {
        await step.sleep(`wait-${round}`, POLL_INTERVALS[round]);
        const remaining = pending;
        try {
          pending = await pgStep(step, `collect-${round}`, COLLECT_STEP, () =>
            collectAiRound(runId, remaining),
          );
        } catch (error) {
          // Posted tasks are already paid for; keep polling them next round.
          console.warn(`[ai-visibility] ${runId} collect-${round}:`, error);
        }
      }
      await pgStep(step, "finalize", SINGLE_ATTEMPT, () =>
        finalizeAiRun(runId),
      );
    } catch (error) {
      console.error(`[ai-visibility] ${runId} failed:`, error);
      await pgStep(step, "mark-failed", SINGLE_ATTEMPT, () =>
        markAiRunFailed(runId, error),
      );
      throw error;
    }
  }
}
