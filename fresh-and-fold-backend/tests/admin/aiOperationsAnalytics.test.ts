import { describe, expect, it, vi } from "vitest";
import AIInteraction from "../../src/models/AIInteraction";
import { aggregateAiInteractions } from "../../src/ai/interactionAnalytics";

describe("Admin AI operations aggregation", () => {
  it("returns aggregate counts without interaction identifiers or customer content", async () => {
    const aggregate = vi.spyOn(AIInteraction, "aggregate").mockReturnValue({
      exec: vi.fn().mockResolvedValue([{ total: [{ count: 2 }], capability: [{ _id: "garment_recognition", count: 2 }], outcome: [{ _id: "complete", count: 2 }], confidence: [{ _id: "high", count: 2 }], source: [{ _id: "voice", count: 1 }], totals: [{ mappedCount: 3, unmappedCount: 1, correctionCount: 2, reviewedCount: 1, continuedToBookingCount: 1, averageMs: 1250 }] }]),
    } as any);
    const result = await aggregateAiInteractions(new Date("2026-01-01"), new Date("2026-01-02"));
    expect(result.totalInteractions).toBe(2);
    expect(result.mapping).toEqual({ mappedCount: 3, unmappedCount: 1 });
    expect(result.duration).toEqual({ averageMs: 1250 });
    expect(JSON.stringify(result)).not.toMatch(/requestId|userId|transcript|raw/i);
    aggregate.mockRestore();
  });
});
