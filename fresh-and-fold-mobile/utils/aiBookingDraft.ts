import { z } from "zod";
import type {
  BookingReviewItem,
  GarmentRecognitionResult,
  SmartScanBookingPrefill,
} from "../types/ai";
import { initialItems, isItemKey, itemKeys, ItemState } from "./bookingData";

const PositiveQuantitySchema = z.number().finite().int().positive();

const CompactItemsSchema = z
  .record(z.string(), PositiveQuantitySchema)
  .superRefine((items, context) => {
    if (Object.keys(items).length === 0) {
      context.addIssue({ code: "custom", message: "At least one reviewed item is required." });
    }

    for (const key of Object.keys(items)) {
      if (!isItemKey(key)) {
        context.addIssue({ code: "custom", message: "Unsupported catalog item." });
      }
    }
  });

/** Strict compact route payload. It intentionally has no AI metadata or prices. */
export const SmartScanBookingPrefillSchema = z
  .object({
    version: z.literal(1),
    source: z.literal("smart_scan"),
    items: CompactItemsSchema,
  })
  .strict();

const isPositiveQuantity = (value: unknown): value is number =>
  PositiveQuantitySchema.safeParse(value).success;

export const createBookingReviewItems = (
  result: GarmentRecognitionResult
): BookingReviewItem[] =>
  result.detections.map((detection, index) => {
    const catalogItemId =
      detection.mappingStatus === "mapped" && isItemKey(detection.catalogItemId)
        ? detection.catalogItemId
        : null;

    return {
      id: `${index}:${detection.detectedLabel}`,
      detectedLabel: detection.detectedLabel,
      catalogItemId,
      mappingStatus: catalogItemId ? "mapped" : "unmapped",
      quantity: detection.quantity,
      confidence: detection.confidence,
      removed: false,
    };
  });

export const setReviewItemQuantity = (
  items: BookingReviewItem[],
  id: string,
  quantity: number | null
): BookingReviewItem[] =>
  items.map((item) => (item.id === id ? { ...item, quantity } : item));

export const removeReviewItem = (items: BookingReviewItem[], id: string): BookingReviewItem[] =>
  items.map((item) => (item.id === id ? { ...item, removed: true } : item));

export type SmartScanPrefillBuildResult = {
  prefill: SmartScanBookingPrefill | null;
  unresolvedQuantityItemIds: string[];
};

/**
 * Aggregates only user-reviewed mapped catalog items. Unsupported, removed,
 * and uncertain items cannot reach the existing booking flow.
 */
export const buildSmartScanBookingPrefill = (
  reviewItems: BookingReviewItem[]
): SmartScanPrefillBuildResult => {
  const unresolvedQuantityItemIds = reviewItems
    .filter((item) => !item.removed && item.catalogItemId && !isPositiveQuantity(item.quantity))
    .map((item) => item.id);

  if (unresolvedQuantityItemIds.length > 0) {
    return { prefill: null, unresolvedQuantityItemIds };
  }

  const items = reviewItems.reduce<Partial<Record<(typeof itemKeys)[number], number>>>(
    (aggregate, item) => {
      if (!item.removed && item.catalogItemId && isPositiveQuantity(item.quantity)) {
        aggregate[item.catalogItemId] = (aggregate[item.catalogItemId] ?? 0) + item.quantity;
      }
      return aggregate;
    },
    {}
  );

  if (Object.keys(items).length === 0) {
    return { prefill: null, unresolvedQuantityItemIds: [] };
  }

  const parsed = SmartScanBookingPrefillSchema.safeParse({
    version: 1,
    source: "smart_scan",
    items,
  });

  return parsed.success
    ? { prefill: parsed.data as SmartScanBookingPrefill, unresolvedQuantityItemIds: [] }
    : { prefill: null, unresolvedQuantityItemIds: [] };
};

export const serializeSmartScanBookingPrefill = (prefill: SmartScanBookingPrefill): string =>
  JSON.stringify(SmartScanBookingPrefillSchema.parse(prefill));

/** Validates the complete route payload. Invalid state is never partially applied. */
export const hydrateSmartScanBookingPrefill = (
  value: string | string[] | undefined
): ItemState | null => {
  if (typeof value !== "string") return null;

  try {
    const parsed = SmartScanBookingPrefillSchema.safeParse(JSON.parse(value));
    if (!parsed.success) return null;

    return { ...initialItems, ...parsed.data.items };
  } catch {
    return null;
  }
};

/** Prevents route re-renders from overwriting edits after a prefill has applied once. */
export const shouldApplySmartScanPrefill = (
  lastAppliedRouteValue: string | null,
  routeValue: string | string[] | undefined,
  hydratedItems: ItemState | null
): routeValue is string =>
  typeof routeValue === "string" && hydratedItems !== null && routeValue !== lastAppliedRouteValue;
