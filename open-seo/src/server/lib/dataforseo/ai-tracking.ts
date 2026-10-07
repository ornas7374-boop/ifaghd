import { dataforseoGet, dataforseoPost } from "@/server/lib/dataforseo/core";
import { MAX_TASKS_PER_POST } from "@/server/lib/dataforseo/shared";
import {
  isNoResultsTask,
  isTaskInProgress,
  type DataforseoApiResponse,
  type DataforseoTaskLike,
} from "@/server/lib/dataforseo/envelope";
import { AppError } from "@/server/lib/errors";
import type { AiEngine } from "@/shared/ai-visibility";

// Standard-queue tasks for AI visibility tracking: task_post, then a free
// task_get/advanced by task ID.
// https://docs.dataforseo.com/v3/ai_optimization/chat_gpt/llm_scraper/overview/
// https://docs.dataforseo.com/v3/serp/google/organic/overview/
const AI_TRACKING_ENDPOINTS: Record<AiEngine, string> = {
  chatgpt: "/v3/ai_optimization/chat_gpt/llm_scraper",
  gemini: "/v3/ai_optimization/gemini/llm_scraper",
  google_ai_overview: "/v3/serp/google/organic",
};

interface AiTrackingTaskInput {
  /** Echoed back by DataForSEO; maps a task to its answer row. */
  tag: string;
  prompt: string;
}

export interface PostedAiTrackingTask {
  tag: string;
  taskId: string;
}

/**
 * The LLM Scraper language lists name three project-market languages
 * differently, and Gemini only offers Brazilian Portuguese. The organic
 * SERP uses the project-market codes.
 */
function providerLanguageCode(engine: AiEngine, languageCode: string) {
  if (engine === "google_ai_overview") return languageCode;
  if (languageCode === "nb") return "no";
  if (languageCode === "tl") return "fil";
  if (languageCode === "pt" && engine !== "chatgpt") return "pt-BR";
  return languageCode;
}

/**
 * Posts up to 100 prompts for one engine. DataForSEO bills at task_post, so
 * this is the metered call. Rejected entries come back without a task; the
 * caller fails their answers.
 */
export async function postAiTrackingTasks(input: {
  engine: AiEngine;
  tasks: AiTrackingTaskInput[];
  locationCode: number;
  languageCode: string;
}): Promise<DataforseoApiResponse<PostedAiTrackingTask[]>> {
  if (input.tasks.length === 0 || input.tasks.length > MAX_TASKS_PER_POST) {
    throw new AppError(
      "INTERNAL_ERROR",
      `task_post accepts 1-${MAX_TASKS_PER_POST} tasks, got ${input.tasks.length}`,
    );
  }
  const endpoint = AI_TRACKING_ENDPOINTS[input.engine];
  const response = await dataforseoPost<
    DataforseoTaskLike & { id?: string; data?: Record<string, unknown> }
  >(
    `${endpoint}/task_post`,
    input.tasks.map((task) => ({
      // DataForSEO decodes %-escapes in keywords; escape literal % and +.
      keyword: task.prompt.replace(/%/g, "%25").replace(/\+/g, "%2B"),
      location_code: input.locationCode,
      language_code: providerLanguageCode(input.engine, input.languageCode),
      // Loads an overview that Google renders after the page. DataForSEO
      // refunds the extra charge when no overview loads.
      ...(input.engine === "google_ai_overview"
        ? { depth: 10, load_async_ai_overview: true }
        : {}),
      tag: task.tag,
    })),
    // A billed task_post must never be replayed on an ambiguous 5xx.
    { maxServerErrorRetries: 0 },
  );
  if (!response || response.status_code !== 20000) {
    throw new AppError(
      "INTERNAL_ERROR",
      response?.status_message || "DataForSEO task_post failed",
    );
  }
  // Cost is summed over every entry, accepted or not, so anything DataForSEO
  // charged is metered.
  const posted: PostedAiTrackingTask[] = [];
  let costUsd = 0;
  for (const entry of response.tasks ?? []) {
    costUsd += entry.cost ?? 0;
    const tag: unknown = entry.data?.tag;
    if (entry.status_code !== 20100 || !entry.id || typeof tag !== "string") {
      console.warn(
        `dataforseo.ai_tracking.task_post.rejected-entry (${entry.status_code}): ${entry.status_message}`,
      );
      continue;
    }
    posted.push({ tag, taskId: entry.id });
  }
  return {
    data: posted,
    billing: {
      path: `${endpoint}/task_post`.slice(1).split("/"),
      costUsd,
    },
  };
}

type AiTrackingTaskOutcome =
  | { status: "pending" }
  | { status: "failed"; message: string }
  /** `result` is null when Google returned no results page. */
  | { status: "completed"; result: unknown };

/**
 * Collects one queued answer. Not metered, like fetchRankCheckTaskResult: the
 * task was charged at task_post.
 */
export async function fetchAiTrackingTaskResult(input: {
  engine: AiEngine;
  taskId: string;
}): Promise<AiTrackingTaskOutcome> {
  const response = await dataforseoGet(
    `${AI_TRACKING_ENDPOINTS[input.engine]}/task_get/advanced/${encodeURIComponent(input.taskId)}`,
  );
  const task = response?.tasks?.[0];
  if (!response || response.status_code !== 20000 || !task) {
    throw new AppError(
      "INTERNAL_ERROR",
      response?.status_message || "DataForSEO task_get failed",
    );
  }
  if (isTaskInProgress(task)) return { status: "pending" };
  if (task.status_code !== 20000) {
    if (isNoResultsTask(task)) return { status: "completed", result: null };
    return {
      status: "failed",
      message:
        task.status_message || `DataForSEO task failed (${task.status_code})`,
    };
  }
  return { status: "completed", result: task.result?.[0] ?? null };
}
