import { beforeEach, describe, expect, it, vi } from "vitest";
import { projectCompetitors } from "@/db/schema";
import { AiVisibilityRepository as repo } from "../repositories/AiVisibilityRepository";
import {
  collectAiRound,
  finalizeAiRun,
  postAiBatch,
} from "./aiVisibilityCollection";
import { configuration, customer } from "./aiVisibilityTestFixtures";

const { testDb, dataforseo } = await vi.hoisted(async () => {
  const { createAiVisibilityTestDb } = await import("../aiVisibilityTestDb");
  return {
    testDb: await createAiVisibilityTestDb(),
    dataforseo: { trackingTaskPost: vi.fn(), fetchTaskResult: vi.fn() },
  };
});
vi.mock("cloudflare:workers", () => ({ env: { DATABASE_PROVIDER: "d1" } }));
vi.mock("@/db", () => ({ db: testDb.db }));
vi.mock("@/db/runBatch", () => ({ runBatch: testDb.runBatch }));
vi.mock("@/server/lib/runtime-env", () => ({
  isHostedServerAuthMode: async () => false,
}));
vi.mock("@/server/lib/dataforseo", () => ({
  MAX_TASKS_PER_POST: 100,
  createDataforseoClient: () => ({
    aiSearch: { trackingTaskPost: dataforseo.trackingTaskPost },
  }),
  fetchAiTrackingTaskResult: dataforseo.fetchTaskResult,
}));

const runId = "run";
const market = { locationCode: 2840, languageCode: "en" };

beforeEach(async () => {
  await testDb.seedProject();
  await testDb.db.insert(projectCompetitors).values({
    id: "competitor",
    projectId: "project",
    domain: "ahrefs.com",
    name: "Ahrefs",
    updatedBy: "user",
  });
  const rows = configuration({
    engines: ["chatgpt"],
    prompts: [{ text: "Which SEO tools?" }, { text: "Best rank tracker?" }],
  });
  await repo.saveConfiguration(rows);
  await repo.createRun(
    {
      id: runId,
      trackerId: rows.tracker.id,
      projectId: "project",
      trigger: "manual",
      status: "running",
      ...market,
      createdAt: "2026-09-05T12:00:00.000Z",
    },
    rows.prompts.map((prompt, index) => ({
      id: `answer-${index}`,
      runId,
      promptId: prompt.id,
      engine: "chatgpt",
      branded: false,
    })),
  );
});

describe("AI answer collection", () => {
  it("saves an answer with its citations and each brand's mention and citation", async () => {
    dataforseo.fetchTaskResult.mockResolvedValue({
      status: "completed",
      result: {
        markdown:
          "Try **Ahrefs** or OpenSEO [1](https://openseo.so/pricing?utm_source=chatgpt)",
        sources: [
          {
            url: "https://openseo.so/pricing?utm_source=chatgpt",
            title: "Pricing",
          },
        ],
      },
    });

    const pending = await collectAiRound(runId, [
      { tag: "answer-0", taskId: "task", engine: "chatgpt" },
    ]);

    expect(pending).toEqual([]);
    expect(await repo.getObservation("answer-0")).toMatchObject({
      status: "completed",
    });
    const evidence = await repo.getEvidence(["answer-0"]);
    expect(evidence.sources).toMatchObject([
      { url: "https://openseo.so/pricing", domain: "openseo.so", position: 1 },
    ]);
    expect(evidence.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: "openseo.so",
          own: true,
          mentioned: true,
          cited: true,
          firstMention: 14,
        }),
        expect.objectContaining({
          domain: "ahrefs.com",
          own: false,
          mentioned: true,
          cited: false,
          firstMention: 4,
        }),
      ]),
    );
  });

  it("fails the answers DataForSEO did not accept and collects the rest", async () => {
    dataforseo.trackingTaskPost.mockResolvedValue([
      { tag: "answer-0", taskId: "task" },
    ]);

    const pending = await postAiBatch(runId, customer, market, {
      engine: "chatgpt",
      tasks: [
        { tag: "answer-0", prompt: "Which SEO tools?" },
        { tag: "answer-1", prompt: "Best rank tracker?" },
      ],
    });

    expect(pending).toEqual([
      { tag: "answer-0", taskId: "task", engine: "chatgpt" },
    ]);
    expect(await repo.getObservation("answer-1")).toMatchObject({
      status: "failed",
    });
  });

  it("fails answers that never arrived and finishes the run as partial", async () => {
    dataforseo.fetchTaskResult.mockResolvedValue({
      status: "completed",
      result: { markdown: "OpenSEO", sources: [] },
    });
    await collectAiRound(runId, [
      { tag: "answer-0", taskId: "task", engine: "chatgpt" },
    ]);

    await finalizeAiRun(runId);

    expect(await repo.getRunInternal(runId)).toMatchObject({
      status: "partial",
    });
    expect(await repo.getObservation("answer-1")).toMatchObject({
      status: "failed",
      error: "No answer arrived within the collection window.",
    });
  });
});
