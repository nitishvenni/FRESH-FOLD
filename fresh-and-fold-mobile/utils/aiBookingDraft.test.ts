import { describe, expect, it } from "vitest";
import type { GarmentRecognitionResult, NaturalLanguageBookingResult } from "../types/ai";
import { initialItems, ItemKey } from "./bookingData";
import {
  buildSmartScanBookingPrefill,
  buildNaturalLanguageBookingPrefill,
  createBookingReviewItems,
  getDefaultNaturalLanguageBookingSelections,
  hydrateAiBookingPrefill,
  hydrateSmartScanBookingPrefill,
  removeReviewItem,
  serializeSmartScanBookingPrefill,
  serializeNaturalLanguageBookingPrefill,
  setReviewItemQuantity,
  shouldApplySmartScanPrefill,
} from "./aiBookingDraft";

const result = (detections: GarmentRecognitionResult["detections"]): GarmentRecognitionResult => ({
  status: "complete",
  warnings: [],
  requestId: "scan_request_123",
  requiresUserReview: true,
  detections,
});

const mapped = (catalogItemId: ItemKey, quantity: number | null) => ({
  detectedLabel: catalogItemId,
  normalizedLabel: catalogItemId,
  catalogItemId,
  mappingStatus: "mapped" as const,
  quantity,
  confidence: 0.9,
});

describe("Smart Scan compact booking prefill", () => {
  it("serializes only valid reviewed catalog quantities", () => {
    const review = createBookingReviewItems(result([mapped("shirt", 2), mapped("jeans", 1)]));
    const built = buildSmartScanBookingPrefill(review);

    expect(built).toEqual({
      prefill: { version: 1, source: "smart_scan", items: { shirt: 2, jeans: 1 } },
      unresolvedQuantityItemIds: [],
    });
    expect(JSON.parse(serializeSmartScanBookingPrefill(built.prefill!))).toEqual(built.prefill);
  });

  it.each([
    ["unknown catalog key", { version: 1, source: "smart_scan", items: { suit: 1 } }],
    ["injected price", { version: 1, source: "smart_scan", items: { shirt: 1 }, price: 20 }],
    ["injected service", { version: 1, source: "smart_scan", items: { shirt: 1 }, service: "wash" }],
    ["injected provider", { version: 1, source: "smart_scan", items: { shirt: 1 }, provider: "gemini" }],
    ["zero quantity", { version: 1, source: "smart_scan", items: { shirt: 0 } }],
    ["negative quantity", { version: 1, source: "smart_scan", items: { shirt: -1 } }],
    ["fractional quantity", { version: 1, source: "smart_scan", items: { shirt: 1.5 } }],
    ["null quantity", { version: 1, source: "smart_scan", items: { shirt: null } }],
    ["unsupported schema version", { version: 2, source: "smart_scan", items: { shirt: 1 } }],
  ])("rejects %s without partial hydration", (_caseName, payload) => {
    expect(hydrateSmartScanBookingPrefill(JSON.stringify(payload))).toBeNull();
  });

  it("rejects malformed JSON", () => {
    expect(hydrateSmartScanBookingPrefill("{not-json")).toBeNull();
  });

  it("aggregates duplicate mapped garment detections deterministically", () => {
    const review = createBookingReviewItems(result([mapped("shirt", 2), mapped("shirt", 3)]));

    expect(buildSmartScanBookingPrefill(review).prefill).toEqual({
      version: 1,
      source: "smart_scan",
      items: { shirt: 5 },
    });
  });

  it("includes descriptive mapped detections in compact prefill and validated hydration", () => {
    const review = createBookingReviewItems(
      result([
        {
          detectedLabel: "Maroon T-Shirt",
          normalizedLabel: "maroon t shirt",
          catalogItemId: "tshirt",
          mappingStatus: "mapped",
          quantity: 2,
          confidence: 0.98,
        },
        {
          detectedLabel: "Black Folded Trousers",
          normalizedLabel: "black folded trousers",
          catalogItemId: "trousers",
          mappingStatus: "mapped",
          quantity: 1,
          confidence: 0.92,
        },
      ])
    );
    const prefill = buildSmartScanBookingPrefill(review).prefill;

    expect(prefill).toEqual({
      version: 1,
      source: "smart_scan",
      items: { tshirt: 2, trousers: 1 },
    });
    expect(hydrateSmartScanBookingPrefill(serializeSmartScanBookingPrefill(prefill!))).toEqual({
      ...initialItems,
      tshirt: 2,
      trousers: 1,
    });
  });

  it("includes every approved Phase C.1 category and the sweatshirt alias in the validated prefill", () => {
    const review = createBookingReviewItems(
      result([
        { ...mapped("shorts", 1), detectedLabel: "Black Shorts" },
        { ...mapped("leggings", 2), detectedLabel: "Blue Leggings" },
        { ...mapped("skirt", 1), detectedLabel: "Printed Skirt" },
        { ...mapped("kurta", 1), detectedLabel: "White Kurta" },
        { ...mapped("saree", 1), detectedLabel: "Red Saree" },
        { ...mapped("hoodie", 1), detectedLabel: "Black Hoodie" },
        { ...mapped("sweater", 1), detectedLabel: "Grey Sweatshirt" },
      ])
    );

    const prefill = buildSmartScanBookingPrefill(review).prefill;
    expect(prefill).toEqual({
      version: 1,
      source: "smart_scan",
      items: { shorts: 1, leggings: 2, skirt: 1, kurta: 1, saree: 1, hoodie: 1, sweater: 1 },
    });
    expect(hydrateSmartScanBookingPrefill(serializeSmartScanBookingPrefill(prefill!))).toEqual({
      ...initialItems,
      shorts: 1,
      leggings: 2,
      skirt: 1,
      kurta: 1,
      saree: 1,
      hoodie: 1,
      sweater: 1,
    });
  });

  it("keeps unmapped garments visible in review but excludes them from the prefill", () => {
    const review = createBookingReviewItems(
      result([
        mapped("shirt", 1),
        {
          detectedLabel: "Silk Saree",
          normalizedLabel: "silk saree",
          catalogItemId: null,
          mappingStatus: "unmapped",
          quantity: 1,
          confidence: 0.8,
        },
      ])
    );

    expect(review[1]).toMatchObject({ detectedLabel: "Silk Saree", catalogItemId: null });
    expect(buildSmartScanBookingPrefill(review).prefill?.items).toEqual({ shirt: 1 });
  });

  it("requires a user correction or removal for a mapped detection with an unclear quantity", () => {
    const review = createBookingReviewItems(result([mapped("shirt", null)]));
    expect(buildSmartScanBookingPrefill(review).unresolvedQuantityItemIds).toEqual([review[0].id]);

    const corrected = setReviewItemQuantity(review, review[0].id, 2);
    expect(buildSmartScanBookingPrefill(corrected).prefill?.items).toEqual({ shirt: 2 });
  });

  it("excludes a user-removed detection", () => {
    const review = createBookingReviewItems(result([mapped("shirt", 2), mapped("jeans", 1)]));
    const removed = removeReviewItem(review, review[0].id);

    expect(buildSmartScanBookingPrefill(removed).prefill?.items).toEqual({ jeans: 1 });
  });

  it("does not create a meaningful prefill for an empty reviewed selection", () => {
    const review = createBookingReviewItems(result([mapped("shirt", 1)]));
    const removed = removeReviewItem(review, review[0].id);

    expect(buildSmartScanBookingPrefill(removed)).toEqual({
      prefill: null,
      unresolvedQuantityItemIds: [],
    });
  });

  it("hydrates a valid compact prefill into the existing manual item state", () => {
    const routeValue = JSON.stringify({ version: 1, source: "smart_scan", items: { shirt: 2, jeans: 1 } });

    expect(hydrateSmartScanBookingPrefill(routeValue)).toEqual({
      ...initialItems,
      shirt: 2,
      jeans: 1,
    });
  });

  it("applies a valid route prefill once and does not reset subsequent user edits", () => {
    const routeValue = JSON.stringify({ version: 1, source: "smart_scan", items: { shirt: 2 } });
    const hydrated = hydrateSmartScanBookingPrefill(routeValue);

    expect(shouldApplySmartScanPrefill(null, routeValue, hydrated)).toBe(true);
    expect(shouldApplySmartScanPrefill(routeValue, routeValue, hydrated)).toBe(false);
    expect(shouldApplySmartScanPrefill(null, undefined, hydrated)).toBe(false);
  });

  it("builds a strict V4 natural-language prefill only from independently accepted dimensions", () => {
    const review = createBookingReviewItems(result([mapped("shirt", 2), mapped("jeans", 1)]));
    const built = buildNaturalLanguageBookingPrefill(review, "dry", "express");

    expect(built).toEqual({
      prefill: { version: 4, source: "natural_language", items: { shirt: 2, jeans: 1 }, cleaningService: "dry", speed: "express" },
      unresolvedQuantityItemIds: [],
    });
    expect(hydrateAiBookingPrefill(serializeNaturalLanguageBookingPrefill(built.prefill!))).toEqual({
      items: { ...initialItems, shirt: 2, jeans: 1 },
      cleaningService: "dry",
      speed: "express",
    });
  });

  it("converts reviewed plural natural-language labels into V4 canonical quantities", () => {
    const naturalLanguageResult: NaturalLanguageBookingResult = {
      status: "complete",
      warnings: [],
      requestId: "booking_request_123",
      requiresUserReview: true,
      source: "natural_language",
      items: [
        { detectedLabel: "shirts", normalizedLabel: "shirts", catalogItemId: "shirt", mappingStatus: "mapped", quantity: 2, confidence: 0.95 },
        { detectedLabel: "jeans", normalizedLabel: "jeans", catalogItemId: "jeans", mappingStatus: "mapped", quantity: 1, confidence: 0.96 },
      ],
      cleaningService: "wash",
      speed: null,
      pickupDate: null,
      pickupSlot: null,
      pickupPreference: null,
      specialInstructions: null,
      unresolvedFields: [],
    };
    const review = createBookingReviewItems(naturalLanguageResult);

    expect(review.map((item) => item.detectedLabel)).toEqual(["shirts", "jeans"]);
    expect(buildNaturalLanguageBookingPrefill(review)).toEqual({
      prefill: { version: 4, source: "natural_language", items: { shirt: 2, jeans: 1 } },
      unresolvedQuantityItemIds: [],
    });
  });

  it("includes plural jackets and independent accepted dry and express values in V4", () => {
    const naturalLanguageResult: NaturalLanguageBookingResult = {
      status: "complete",
      warnings: [],
      requestId: "booking_request_456",
      requiresUserReview: true,
      source: "natural_language",
      items: [{ detectedLabel: "jackets", normalizedLabel: "jackets", catalogItemId: "jacket", mappingStatus: "mapped", quantity: 2, confidence: 0.94 }],
      cleaningService: "dry",
      speed: "express",
      pickupDate: null,
      pickupSlot: null,
      pickupPreference: null,
      specialInstructions: null,
      unresolvedFields: [],
    };

    expect(buildNaturalLanguageBookingPrefill(createBookingReviewItems(naturalLanguageResult), "dry", "express")).toEqual({
      prefill: { version: 4, source: "natural_language", items: { jacket: 2 }, cleaningService: "dry", speed: "express" },
      unresolvedQuantityItemIds: [],
    });
  });

  it("allows a reviewed global speed without items and keeps V2 hydration safely compatible", () => {
    const built = buildNaturalLanguageBookingPrefill([], undefined, "express");
    expect(built.prefill).toEqual({ version: 4, source: "natural_language", items: {}, speed: "express" });

    expect(hydrateAiBookingPrefill(JSON.stringify({ version: 2, source: "natural_language", items: { shirt: 1 }, service: "dry" }))).toEqual({ items: { ...initialItems, shirt: 1 }, cleaningService: "dry", speed: "standard" });
    expect(hydrateAiBookingPrefill(JSON.stringify({ version: 2, source: "natural_language", items: { shirt: 1 }, service: "express" }))).toEqual({ items: { ...initialItems, shirt: 1 }, speed: "express" });

    expect(hydrateAiBookingPrefill(JSON.stringify({ version: 2, source: "natural_language", items: {}, price: 20 }))).toBeNull();
    expect(hydrateAiBookingPrefill(JSON.stringify({ version: 2, source: "natural_language", items: {}, payment: { amount: 20 } }))).toBeNull();
    expect(hydrateAiBookingPrefill(JSON.stringify({ version: 2, source: "natural_language", items: {}, orderId: "order_123", provider: "gemini" }))).toBeNull();
    expect(hydrateAiBookingPrefill(JSON.stringify({ version: 2, source: "natural_language", items: {}, requestText: "raw request", address: "private" }))).toBeNull();
    expect(hydrateAiBookingPrefill(JSON.stringify({ version: 2, source: "natural_language", items: { suit: 1 } }))).toBeNull();
    expect(hydrateAiBookingPrefill(JSON.stringify({ version: 2, source: "natural_language", items: {} }))).toBeNull();
  });

  it("defaults explicit dry and express intent into V4 and hydrates both booking controls", () => {
    const explicit: NaturalLanguageBookingResult = {
      status: "complete", warnings: [], requestId: "booking_request_explicit", requiresUserReview: true,
      source: "natural_language", items: [mapped("jacket", 2)], cleaningService: "dry", speed: "express",
      pickupDate: null, pickupSlot: null, pickupPreference: null, specialInstructions: null, unresolvedFields: [],
    };
    const selections = getDefaultNaturalLanguageBookingSelections(explicit);
    expect(selections).toEqual({ cleaningService: "dry", speed: "express" });
    const prefill = buildNaturalLanguageBookingPrefill(createBookingReviewItems(explicit), selections.cleaningService, selections.speed).prefill!;
    expect(prefill).toEqual({ version: 4, source: "natural_language", items: { jacket: 2 }, cleaningService: "dry", speed: "express" });
    expect(hydrateAiBookingPrefill(serializeNaturalLanguageBookingPrefill(prefill))).toEqual({ items: { ...initialItems, jacket: 2 }, cleaningService: "dry", speed: "express" });
  });

  it("selects only explicit dimensions and lets a deselection exclude each from V4", () => {
    const review = createBookingReviewItems(result([mapped("jacket", 2)]));
    expect(buildNaturalLanguageBookingPrefill(review, "dry").prefill).toEqual({ version: 4, source: "natural_language", items: { jacket: 2 }, cleaningService: "dry" });
    expect(buildNaturalLanguageBookingPrefill(review, undefined, "express").prefill).toEqual({ version: 4, source: "natural_language", items: { jacket: 2 }, speed: "express" });
    expect(buildNaturalLanguageBookingPrefill(review).prefill).toEqual({ version: 4, source: "natural_language", items: { jacket: 2 } });
  });

  it("carries only reviewed canonical scheduling values in V4 and hydrates them without changing V3 support", () => {
    const review = createBookingReviewItems(result([mapped("jacket", 2)]));
    const prefill = buildNaturalLanguageBookingPrefill(review, "dry", "express", "2026-07-21", "12 PM - 3 PM").prefill!;
    expect(prefill).toEqual({ version: 4, source: "natural_language", items: { jacket: 2 }, cleaningService: "dry", speed: "express", pickupDate: "2026-07-21", pickupSlot: "12 PM - 3 PM" });
    expect(hydrateAiBookingPrefill(serializeNaturalLanguageBookingPrefill(prefill))).toEqual({ items: { ...initialItems, jacket: 2 }, cleaningService: "dry", speed: "express", pickupDate: "2026-07-21", pickupSlot: "12 PM - 3 PM" });
    expect(hydrateAiBookingPrefill(JSON.stringify({ version: 3, source: "natural_language", items: { shirt: 1 }, cleaningService: "wash", speed: "standard" }))).toEqual({ items: { ...initialItems, shirt: 1 }, cleaningService: "wash", speed: "standard" });
  });

  it("rejects raw request text or non-canonical scheduling data in V4", () => {
    expect(hydrateAiBookingPrefill(JSON.stringify({ version: 4, source: "natural_language", items: { shirt: 1 }, pickupDate: "tomorrow" }))).toBeNull();
    expect(hydrateAiBookingPrefill(JSON.stringify({ version: 4, source: "natural_language", items: { shirt: 1 }, pickupSlot: "12pm" }))).toBeNull();
    expect(hydrateAiBookingPrefill(JSON.stringify({ version: 4, source: "natural_language", items: { shirt: 1 }, requestText: "private" }))).toBeNull();
  });

  it("does not default ambiguous or unresolved booking dimensions", () => {
    const ambiguous: NaturalLanguageBookingResult = {
      status: "partial", warnings: [], requestId: "booking_request_ambiguous", requiresUserReview: true,
      source: "natural_language", items: [mapped("jacket", 2)], cleaningService: "dry", speed: "express",
      pickupDate: null, pickupSlot: null, pickupPreference: null, specialInstructions: null,
      unresolvedFields: ["cleaning_service", "speed"],
    };
    expect(getDefaultNaturalLanguageBookingSelections(ambiguous)).toEqual({});
  });

  it("keeps V1 Smart Scan hydration unchanged through the common hydrator", () => {
    expect(hydrateAiBookingPrefill(JSON.stringify({ version: 1, source: "smart_scan", items: { shirt: 2 } }))).toEqual({
      items: { ...initialItems, shirt: 2 },
    });
  });
});
