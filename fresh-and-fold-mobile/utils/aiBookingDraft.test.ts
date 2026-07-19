import { describe, expect, it } from "vitest";
import type { GarmentRecognitionResult } from "../types/ai";
import { initialItems, ItemKey } from "./bookingData";
import {
  buildSmartScanBookingPrefill,
  buildNaturalLanguageBookingPrefill,
  createBookingReviewItems,
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

  it("builds a strict V2 natural-language prefill only from reviewed items and an accepted service", () => {
    const review = createBookingReviewItems(result([mapped("shirt", 2), mapped("jeans", 1)]));
    const built = buildNaturalLanguageBookingPrefill(review, "dry");

    expect(built).toEqual({
      prefill: { version: 2, source: "natural_language", items: { shirt: 2, jeans: 1 }, service: "dry" },
      unresolvedQuantityItemIds: [],
    });
    expect(hydrateAiBookingPrefill(serializeNaturalLanguageBookingPrefill(built.prefill!))).toEqual({
      items: { ...initialItems, shirt: 2, jeans: 1 },
      service: "dry",
    });
  });

  it("allows a reviewed global service without items but rejects unreviewed or injected V2 data", () => {
    const built = buildNaturalLanguageBookingPrefill([], "express");
    expect(built.prefill).toEqual({ version: 2, source: "natural_language", items: {}, service: "express" });

    expect(hydrateAiBookingPrefill(JSON.stringify({ version: 2, source: "natural_language", items: {}, price: 20 }))).toBeNull();
    expect(hydrateAiBookingPrefill(JSON.stringify({ version: 2, source: "natural_language", items: {}, payment: { amount: 20 } }))).toBeNull();
    expect(hydrateAiBookingPrefill(JSON.stringify({ version: 2, source: "natural_language", items: {}, orderId: "order_123", provider: "gemini" }))).toBeNull();
    expect(hydrateAiBookingPrefill(JSON.stringify({ version: 2, source: "natural_language", items: {}, requestText: "raw request", address: "private" }))).toBeNull();
    expect(hydrateAiBookingPrefill(JSON.stringify({ version: 2, source: "natural_language", items: { suit: 1 } }))).toBeNull();
    expect(hydrateAiBookingPrefill(JSON.stringify({ version: 2, source: "natural_language", items: {} }))).toBeNull();
  });

  it("keeps V1 Smart Scan hydration unchanged through the common hydrator", () => {
    expect(hydrateAiBookingPrefill(JSON.stringify({ version: 1, source: "smart_scan", items: { shirt: 2 } }))).toEqual({
      items: { ...initialItems, shirt: 2 },
    });
  });
});
