import { describe, expect, it, vi } from "vitest";
import { aiCostForCount } from "./aiVisibilityCost";
vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("../repositories/AiVisibilityRepository", () => ({
  AiVisibilityRepository: {},
}));
vi.mock("./aiVisibilityMutation", () => ({}));
// Real pricing functions and constants: only unused IO dependencies are mocked.
describe("AI collection estimates", () => {
  it("quotes hosted markup and credit rounding per provider call", () => {
    expect(aiCostForCount(12, true)).toEqual({
      providerCostUsd: 0.0144,
      costCredits: 24,
      costUsd: 0.024,
    });
    expect(aiCostForCount(0, true)).toEqual({
      providerCostUsd: 0,
      costCredits: 0,
      costUsd: 0,
    });
  });
  it("quotes self-hosted provider cost without markup or credits", () => {
    expect(aiCostForCount(3, false)).toEqual({
      providerCostUsd: 0.0036,
      costCredits: 0,
      costUsd: 0.0036,
    });
  });
});
