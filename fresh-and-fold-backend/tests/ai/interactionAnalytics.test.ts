import { describe, expect, it, vi } from "vitest";
import AIInteraction from "../../src/models/AIInteraction";
import {
  AiInteractionEventSchema,
  aggregateAiInteractions,
  confidenceBucketFor,
  confidenceBucketForValues,
  interactionExpiresAt,
  MAX_CORRECTION_COUNT,
} from "../../src/ai/interactionAnalytics";

describe("Phase H interaction analytics", () => {
  it.each([[0.8, "high"], [0.5, "medium"], [0.49, "low"], [null, "unavailable"]] as const)(
    "buckets confidence %s as %s", (confidence, bucket) => expect(confidenceBucketFor(confidence)).toBe(bucket)
  );

  it("uses only meaningful validated confidence values", () => {
    expect(confidenceBucketForValues([null, undefined, 0.55, 0.9])).toBe("high");
    expect(confidenceBucketForValues([NaN, 2])).toBe("unavailable");
  });

  it("uses a 90-day TTL timestamp", () => {
    expect(interactionExpiresAt(new Date("2026-01-01T00:00:00.000Z")).toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(AIInteraction.schema.indexes()).toContainEqual([{ expiresAt: 1 }, { expireAfterSeconds: 0 }]);
  });

  it("rejects arbitrary sensitive metadata and bounds lifecycle events", () => {
    expect(() => new AIInteraction({ capability: "garment_recognition", requestId: "request_12345678", userId: "user-1", outcome: "complete", confidenceBucket: "high", mappedCount: 1, unmappedCount: 0, expiresAt: new Date(), transcript: "private" })).toThrow(/not in schema/i);
    expect(AiInteractionEventSchema.safeParse({ requestId: "request_12345678", event: "reviewed", correctionCount: MAX_CORRECTION_COUNT }).success).toBe(true);
    expect(AiInteractionEventSchema.safeParse({ requestId: "request_12345678", event: "reviewed", correctionCount: MAX_CORRECTION_COUNT + 1 }).success).toBe(false);
    expect(AiInteractionEventSchema.safeParse({ requestId: "request_12345678", event: "reviewed", transcript: "private" }).success).toBe(false);
  });

  it("returns zero-safe aggregate-only analytics", async () => {
    const aggregate = vi.spyOn(AIInteraction, "aggregate").mockReturnValue({ exec: vi.fn().mockResolvedValue([{}]) } as any);
    const result = await aggregateAiInteractions(new Date("2026-01-01"), new Date("2026-01-02"));
    expect(result).toMatchObject({ totalInteractions: 0, mapping: { mappedCount: 0, unmappedCount: 0 }, review: { reviewedCount: 0, continuedToBookingCount: 0, correctionCount: 0 }, duration: { averageMs: null } });
    expect(JSON.stringify(result)).not.toMatch(/requestId|userId|transcript|payload/i);
    aggregate.mockRestore();
  });
});
