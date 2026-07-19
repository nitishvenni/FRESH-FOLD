import { describe, expect, it } from "vitest";
import {
  BookingDraftSchema,
  CareLabelAnalysisSchema,
  CareLabelModelOutputSchema,
  FabricModelOutputSchema,
  GarmentModelOutputSchema,
  NaturalLanguageBookingModelOutputSchema,
  NaturalLanguageBookingResultSchema,
  StainAnalysisSchema,
  StainModelOutputSchema,
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
        cleaningService: null,
        speed: null,
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

  it("accepts a no-stain result only with null stain and confidence", () => {
    expect(
      StainModelOutputSchema.safeParse({
        status: "no_match",
        stain: null,
        confidence: null,
        careGuidance: { cleaningRecommendation: null, specialTreatment: null, safetyNotes: [], serviceRecommendation: null },
        warnings: [],
      }).success
    ).toBe(true);
  });

  it("accepts recoverable semantic inconsistencies at the provider boundary", () => {
    expect(
      StainModelOutputSchema.safeParse({
        status: "no_match",
        stain: "coffee",
        confidence: 0.8,
        candidates: [{ stain: "tea", confidence: 0.5 }],
      }).success
    ).toBe(true);
  });

  it("accepts ambiguous known candidates without requiring a false primary stain", () => {
    expect(
      StainModelOutputSchema.safeParse({
        status: "partial",
        stain: "unknown",
        confidence: null,
        candidates: [
          { stain: "coffee", confidence: 0.57 },
          { stain: "tea", confidence: 0.52 },
        ],
        warnings: ["The visible mark has competing plausible causes."],
      }).success
    ).toBe(true);
  });

  it("temporarily accepts one unknown candidate for deterministic route normalization", () => {
    expect(
      StainModelOutputSchema.safeParse({
        status: "partial",
        stain: "unknown",
        confidence: null,
        candidates: [{ stain: "oil", confidence: 0.57 }],
        warnings: ["The visible mark is ambiguous."],
      }).success
    ).toBe(true);
  });

  it("accepts a bounded larger candidate list and missing nullable provider fields", () => {
    expect(
      StainModelOutputSchema.safeParse({
        status: "partial",
        candidates: [
          { stain: "coffee", confidence: 0.6 },
          { stain: "tea", confidence: 0.5 },
          { stain: "oil", confidence: 0.4 },
          { stain: "mud", confidence: 0.3 },
        ],
      }).data
    ).toMatchObject({ stain: null, confidence: null, warnings: [] });
  });

  it("keeps the final stain analysis contract strict for one unknown candidate", () => {
    expect(
      StainAnalysisSchema.safeParse({
        status: "partial",
        stain: "unknown",
        confidence: null,
        candidates: [{ stain: "oil", confidence: 0.57 }],
        careGuidance: {
          cleaningRecommendation: null,
          specialTreatment: null,
          safetyNotes: [],
          serviceRecommendation: null,
        },
        warnings: ["The visible mark is ambiguous."],
        requestId: "stain_request_123",
        requiresUserReview: true,
      }).success
    ).toBe(false);
  });

  it("keeps the final stain analysis contract strict for no_match and unreadable results", () => {
    const base = {
      careGuidance: {
        cleaningRecommendation: null,
        specialTreatment: null,
        safetyNotes: [],
        serviceRecommendation: null,
      },
      warnings: [],
      requestId: "stain_request_123",
      requiresUserReview: true,
    };

    expect(StainAnalysisSchema.safeParse({
      ...base, status: "no_match", stain: "coffee", confidence: 0.8, candidates: [],
    }).success).toBe(false);
    expect(StainAnalysisSchema.safeParse({
      ...base, status: "unreadable", stain: "coffee", confidence: 0.8, candidates: [],
    }).success).toBe(false);
  });

  it("accepts type-safe but recoverable care-label provider output", () => {
    expect(
      CareLabelModelOutputSchema.safeParse({
        status: "complete",
        readings: [{
          category: "washing",
          status: "recognized",
          observedSymbol: "wash",
          observedText: "Machine wash",
          interpretation: "Machine wash.",
          confidence: 0.86,
        }],
      }).success
    ).toBe(true);
  });

  it("keeps the final care-label contract strict for canonical category evidence", () => {
    expect(
      CareLabelAnalysisSchema.safeParse({
        status: "complete",
        extractedText: "Machine wash",
        readings: [{
          category: "washing",
          status: "recognized",
          observedSymbol: "wash",
          observedText: "Machine wash",
          interpretation: "Machine wash.",
          confidence: 0.86,
        }],
        unreadableRegions: [],
        warnings: [],
        requestId: "care_label_request_123",
        requiresUserReview: true,
      }).success
    ).toBe(false);
  });

  it("accepts type-safe natural-language provider output but keeps its final review contract strict", () => {
    const providerOutput = NaturalLanguageBookingModelOutputSchema.safeParse({
      status: "partial",
      items: [{ detectedLabel: "Shirt", quantity: null, confidence: 0.5 }],
      pickupPreference: "tomorrow evening",
      unresolvedFields: ["quantity", "pickup_slot"],
    });
    expect(providerOutput.success).toBe(true);

    expect(
      NaturalLanguageBookingResultSchema.safeParse({
        status: "complete",
        warnings: [],
        requestId: "booking_request_123",
        requiresUserReview: true,
        source: "natural_language",
        items: [{
          detectedLabel: "Shirt",
          normalizedLabel: "shirt",
          catalogItemId: "shirt",
          mappingStatus: "mapped",
          quantity: null,
          confidence: 0.5,
        }],
        cleaningService: null,
        speed: null,
        pickupDate: null,
        pickupSlot: null,
        pickupPreference: null,
        specialInstructions: null,
        unresolvedFields: [],
      }).success
    ).toBe(false);
  });
});
