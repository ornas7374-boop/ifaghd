import { describe, expect, it, vi } from "vitest";

vi.mock("../repositories/AiVisibilityRepository", () => ({
  AiVisibilityRepository: { getConfiguration: async () => null },
}));

import { prepareWebsiteTracking } from "./websiteTrackingSetup";

const topic = (name: string) => ({
  name,
  prompts: [1, 2, 3, 4, 5].map((n) => `${name} question ${n}?`),
});

describe("prepareWebsiteTracking", () => {
  it("seeds tracking with only the first three of the five research topics", async () => {
    const tracking = await prepareWebsiteTracking(
      {
        projectId: "4a5b6c7d-0000-4000-8000-000000000000",
        suggestedTopics: [
          "rank tracker",
          "seo tool",
          "backlink checker",
          "keyword research",
          "site audit",
        ].map(topic),
      },
      { locationCode: 2840, languageCode: "en" },
    );

    expect([...new Set(tracking?.prompts.map((row) => row.topic))]).toEqual([
      "rank tracker",
      "seo tool",
      "backlink checker",
    ]);
    expect(tracking?.prompts).toHaveLength(15);
  });
});
