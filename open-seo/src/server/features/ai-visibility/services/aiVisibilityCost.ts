import { AiVisibilityRepository as repo } from "../repositories/AiVisibilityRepository";
import { AiVisibilityError } from "./aiVisibilityErrors";
import { aiScope } from "./aiVisibilityConfiguration";
import {
  getOptionalEnvValue,
  isHostedServerAuthMode,
} from "@/server/lib/runtime-env";
import {
  AI_RECORD_COST_USD,
  type AiCostEstimate,
} from "@/shared/ai-visibility";
import {
  AUTUMN_SEO_DATA_CREDITS_PER_USD,
  creditsForProviderUsd,
} from "@/shared/billing";
import { scheduledChecksPerMonth } from "@/shared/rank-tracking";
import type { EstimateAiCostInput } from "@/types/schemas/ai-visibility";
import { projectPatch } from "./aiVisibilityMutation";

/** The customer's cost for `count` answers: credits when hosted, else provider USD. */
export function aiCostForCount(count: number, hosted: boolean) {
  const providerCostUsd = Math.round(count * AI_RECORD_COST_USD * 1e6) / 1e6;
  const costCredits = count * creditsForProviderUsd(AI_RECORD_COST_USD);
  return {
    providerCostUsd,
    costCredits: hosted ? costCredits : 0,
    costUsd: hosted
      ? costCredits / AUTUMN_SEO_DATA_CREDITS_PER_USD
      : providerCostUsd,
  };
}

export async function estimateCost(
  input: EstimateAiCostInput,
): Promise<AiCostEstimate> {
  const current = await repo.getConfiguration(input.projectId);
  const config = input.patch
    ? (await projectPatch(input.projectId, input.patch, current)).rows
    : current;
  if (!config)
    throw new AiVisibilityError(
      "TRACKER_REQUIRED",
      "Set your project's website and pass proposed prompts, or save tracking before estimating.",
    );
  const scope = aiScope(config, input.promptIds);
  const observations = scope.prompts.length * scope.engines.length;
  const hosted = await isHostedServerAuthMode();
  const cost = aiCostForCount(observations, hosted);
  const scheduleInterval =
    input.scheduleInterval ?? current?.tracker.scheduleInterval ?? "weekly";
  const checksPerMonth = scheduledChecksPerMonth(scheduleInterval);
  return {
    promptCount: scope.prompts.length,
    engineCount: scope.engines.length,
    observations,
    ...cost,
    scheduleInterval,
    checksPerMonth,
    monthlyCostUsd: Math.round(cost.costUsd * checksPerMonth * 1e6) / 1e6,
    currency: "USD",
    warnings: [
      hosted
        ? "Customer cost uses OpenSEO data credits, including the service markup."
        : "Self-hosted: cost estimates your own DataForSEO account charges. OpenSEO credits are not used.",
      `One fresh answer per prompt and engine. The ${scheduleInterval} estimate assumes ${checksPerMonth} ${checksPerMonth === 1 ? "check" : "checks"} per month.`,
      ...(!(await getOptionalEnvValue("DATAFORSEO_API_KEY"))
        ? [
            "DataForSEO is not configured on this server. Setup is available; collection needs an operator to add its API key.",
          ]
        : []),
    ],
  };
}
