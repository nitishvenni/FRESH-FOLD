import { describe, expect, it } from "vitest";
import {
  BookingDraftSchema,
  FabricModelOutputSchema,
  GarmentModelOutputSchema,
} from "../../src/ai/contracts";

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

  it("accepts an advisory fabric result with multiple plausible candidates", () => {
    expect(
      FabricModelOutputSchema.safeParse({
        status: "partial",
        candidates: [
          { fabric: "cotton", confidence: 0.62 },
          { fabric: "rayon", confidence: 0.38 },
        ],
        careGuidance: {
          washing: "Follow the garment care label.",
          drying: "Air dry when the care label permits.",
          ironing: null,
          serviceRecommendation: null,
        },
        warnings: ["Visual identification is uncertain."],
      }).success
    ).toBe(true);
  });

  it("rejects fabric output with invalid guidance or confidence", () => {
    expect(
      FabricModelOutputSchema.safeParse({
        status: "complete",
        candidates: [{ fabric: "cotton", confidence: 1.1 }],
        careGuidance: {
          washing: "Wash normally.",
          drying: "Dry normally.",
          ironing: "Iron normally.",
          serviceRecommendation: "steam",
        },
        warnings: [],
      }).success
    ).toBe(false);
  });
});
