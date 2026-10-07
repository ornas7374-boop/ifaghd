import type { BillingCustomerContext } from "@/server/billing/subscription";
import { getUsageCreditsRemaining } from "@/server/billing/subscription";
import {
  createDataforseoClient,
  fetchAiTrackingTaskResult,
  MAX_TASKS_PER_POST,
  type PostedAiTrackingTask,
} from "@/server/lib/dataforseo";
import { AppError } from "@/server/lib/errors";
import { isHostedServerAuthMode } from "@/server/lib/runtime-env";
import type { AiEngine } from "@/shared/ai-visibility";
import { AiVisibilityRepository as repo } from "../repositories/AiVisibilityRepository";
import { parseDataforseoAnswer } from "../providers/dataforseoEvidence";
import { aiBrands } from "./aiVisibilityConfiguration";
import { aiCostForCount } from "./aiVisibilityCost";
import { matchAiBrand } from "./aiVisibilityMatching";
import { failAiRun } from "./aiVisibilityRuns";

// Each function here is one workflow step body: inputs are its parameters and
// the return value is what the workflow engine persists and replays.

interface AiTaskBatch {
  engine: AiEngine;
  /** Tag = answer row id. At most 100 per task_post. */
  tasks: { tag: string; prompt: string }[];
}
export type AiPendingTask = PostedAiTrackingTask & { engine: AiEngine };
interface AiRunMarket {
  locationCode: number;
  languageCode: string;
}

/**
 * Marks the run running and groups its answers into task_post batches. Hosted
 * runs first check that credits cover the whole check, like rank checks.
 */
export async function prepareAiRun(
  runId: string,
  customer: BillingCustomerContext,
): Promise<{ market: AiRunMarket; batches: AiTaskBatch[] }> {
  const run = await repo.getRunInternal(runId);
  if (!run || (run.status !== "queued" && run.status !== "running"))
    throw new AppError("NOT_FOUND", `Run ${runId} is no longer active.`);
  const answers = (await repo.getObservations([runId])).filter(
    (row) => row.status === "pending",
  );
  if (await isHostedServerAuthMode()) {
    const required = aiCostForCount(answers.length, true).costCredits;
    const credits = await getUsageCreditsRemaining(customer.organizationId);
    if (credits.monthlyRemaining + credits.topupRemaining < required)
      throw new AppError(
        "INSUFFICIENT_CREDITS",
        "Not enough credits for this AI visibility check.",
      );
  }
  await repo.updateRun(runId, { status: "running" });
  const batches: AiTaskBatch[] = [];
  for (const engine of new Set(answers.map((row) => row.engine))) {
    const tasks = answers
      .filter((row) => row.engine === engine)
      .map((row) => ({ tag: row.id, prompt: row.prompt }));
    for (let i = 0; i < tasks.length; i += MAX_TASKS_PER_POST)
      batches.push({ engine, tasks: tasks.slice(i, i + MAX_TASKS_PER_POST) });
  }
  return {
    market: { locationCode: run.locationCode, languageCode: run.languageCode },
    batches,
  };
}

/**
 * Posts one batch through the metered client, which bills it. Answers the
 * provider did not accept fail now; the rest are collected later.
 */
export async function postAiBatch(
  runId: string,
  customer: BillingCustomerContext,
  market: AiRunMarket,
  batch: AiTaskBatch,
): Promise<AiPendingTask[]> {
  let posted: PostedAiTrackingTask[] = [];
  let error = "DataForSEO did not accept this prompt.";
  try {
    posted = await createDataforseoClient(customer).aiSearch.trackingTaskPost({
      engine: batch.engine,
      tasks: batch.tasks,
      ...market,
    });
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause);
  }
  const accepted = new Set(posted.map((task) => task.tag));
  const rejected = batch.tasks
    .map((task) => task.tag)
    .filter((tag) => !accepted.has(tag));
  if (rejected.length)
    await repo.failPendingObservations(runId, error, rejected);
  return posted.map((task) => ({ ...task, engine: batch.engine }));
}

/** Concurrent task_get requests within a collect step. */
const TASK_GET_CONCURRENCY = 25;

/**
 * Reads each pending answer once (task_get is free) and saves finished ones
 * with their citations and brand results. Returns the tasks still pending.
 */
export async function collectAiRound(
  runId: string,
  tasks: AiPendingTask[],
): Promise<AiPendingTask[]> {
  const run = await repo.getRunInternal(runId);
  const project = run ? await repo.getProject(run.projectId) : null;
  if (!run || !project) return [];
  // Brands come from the project as each answer is matched.
  const brands = aiBrands(project, await repo.listCompetitors(project.id));
  const stillPending: AiPendingTask[] = [];
  for (let i = 0; i < tasks.length; i += TASK_GET_CONCURRENCY) {
    const chunk = tasks.slice(i, i + TASK_GET_CONCURRENCY);
    const outcomes = await Promise.allSettled(
      chunk.map((task) => fetchAiTrackingTaskResult(task)),
    );
    for (const [index, outcome] of outcomes.entries()) {
      const task = chunk[index];
      // A failed read is retried next round.
      if (outcome.status === "rejected" || outcome.value.status === "pending") {
        stillPending.push(task);
        continue;
      }
      if (outcome.value.status === "failed") {
        await repo.failPendingObservations(runId, outcome.value.message, [
          task.tag,
        ]);
        continue;
      }
      const answer = parseDataforseoAnswer(outcome.value.result, task.engine);
      if (!answer) {
        await repo.failPendingObservations(
          runId,
          "DataForSEO returned an answer we could not read.",
          [task.tag],
        );
        continue;
      }
      await repo.persistAnswer({
        observationId: task.tag,
        values: {
          status: "completed",
          collectedAt: answer.collectedAt ?? new Date().toISOString(),
          answerMarkdown: answer.answerMarkdown,
          error: null,
        },
        sources: answer.citations.map((citation) => ({
          id: crypto.randomUUID(),
          observationId: task.tag,
          ...citation,
        })),
        matches: brands.map((brand) => ({
          id: crypto.randomUUID(),
          observationId: task.tag,
          ...brand,
          ...matchAiBrand(answer, brand),
        })),
      });
    }
  }
  return stillPending;
}

/** Fails answers that never arrived and records how the run finished. */
export async function finalizeAiRun(runId: string) {
  const run = await repo.getRunInternal(runId);
  if (!run || run.status !== "running") return;
  await repo.failPendingObservations(
    runId,
    "No answer arrived within the collection window.",
  );
  const statuses = await repo.getObservationStatuses([runId]);
  const completed = statuses.filter((row) => row.status === "completed").length;
  const status =
    completed === statuses.length
      ? "completed"
      : completed > 0
        ? "partial"
        : "failed";
  await repo.updateRun(runId, {
    status,
    completedAt: new Date().toISOString(),
  });
  if (status !== "failed")
    await repo.updateTracker(run.trackerId, { lastSkipReason: null });
}

/** The workflow's failure path: fail the run and say why on the tracker. */
export async function markAiRunFailed(runId: string, error: unknown) {
  const message =
    error instanceof AppError && error.code === "INSUFFICIENT_CREDITS"
      ? "Not enough credits for the last check."
      : "The last check could not collect answers.";
  await failAiRun(runId, message);
  const run = await repo.getRunInternal(runId);
  if (run) await repo.updateTracker(run.trackerId, { lastSkipReason: message });
}
