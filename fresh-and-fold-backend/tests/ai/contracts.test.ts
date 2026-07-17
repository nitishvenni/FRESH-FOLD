import { describe, expect, it } from "vitest";
import { BookingDraftSchema, GarmentModelOutputSchema } from "../../src/ai/contracts";

describe("AI contracts", () => {
  it("accepts a complete garment result", () => {
    expect(
      GarmentModelOutputSchema.safeParse({
        status: "complete",
        detections: [{ detectedLabel: "T-Shirt", quantity: 2, confidence: 0.94 }],
        warnings: [],
      }).success
    ).toBe(true);
  });

  it("accepts a partial unknown result without a catalog item", () => {
    expect(
      GarmentModelOutputSchema.safeParse({
        status: "partial",
        detections: [{ detectedLabel: "Silk Saree", quantity: 1, confidence: 0.51 }],
        warnings: ["Catalog mapping requires review."],
      }).success
    ).toBe(true);
  });

  it("accepts an unknown quantity when image evidence is insufficient", () => {
    expect(
      GarmentModelOutputSchema.safeParse({
        status: "partial",
        detections: [{ detectedLabel: "Shirts", quantity: null, confidence: 0.48 }],
        warnings: ["The number of shirts is unclear."],
      }).success
    ).toBe(true);
  });

  it("accepts an unreadable reviewed booking draft", () => {
    expect(
      BookingDraftSchema.safeParse({
        status: "unreadable",
        warnings: ["Image was unreadable."],
        requestId: "request_12345678",
        requiresUserReview: true,
        source: "smart_scan",
        items: [],
        service: null,
        pickupDate: null,
        pickupSlot: null,
        pickupPreference: null,
        specialInstructions: null,
        unresolvedFields: ["items"],
      }).success
    ).toBe(true);
  });

  it("rejects malformed provider output", () => {
    expect(
      GarmentModelOutputSchema.safeParse({
        status: "complete",
        detections: [{ detectedLabel: "Shirt", quantity: 0, confidence: 1.5 }],
        warnings: "not-an-array",
      }).success
    ).toBe(false);
  });
});
