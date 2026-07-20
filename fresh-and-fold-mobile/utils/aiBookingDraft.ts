import { z } from "zod";
import type {
  BookingReviewItem,
  GarmentRecognitionResult,
  NaturalLanguageBookingPrefill,
  NaturalLanguageBookingPrefillV3,
  NaturalLanguageBookingPrefillV4,
  NaturalLanguageBookingResult,
  SmartScanBookingPrefill,
} from "../types/ai";
import { initialItems, isItemKey, itemKeys, ItemState } from "./bookingData";
import { isPickupSlot, PICKUP_SLOTS, type PickupSlot } from "./bookingSchedule";

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

const ServiceIdSchema = z.enum(["wash", "dry", "express"]);
const CleaningServiceSchema = z.enum(["wash", "dry"]);
const FulfillmentSpeedSchema = z.enum(["standard", "express"]);
const PickupSlotSchema = z.enum(PICKUP_SLOTS.map((slot) => slot.value) as [PickupSlot, ...PickupSlot[]]);

/** Phase G's compact reviewed route state; V1 Smart Scan remains unchanged. */
export const NaturalLanguageBookingPrefillSchema = z
  .object({
    version: z.literal(2),
    source: z.literal("natural_language"),
    items: z.record(z.string(), PositiveQuantitySchema).superRefine((items, context) => {
      for (const key of Object.keys(items)) {
        if (!isItemKey(key)) {
          context.addIssue({ code: "custom", message: "Unsupported catalog item." });
        }
      }
    }),
    service: ServiceIdSchema.optional(),
  })
  .strict()
  .superRefine((prefill, context) => {
    if (Object.keys(prefill.items).length === 0 && !prefill.service) {
      context.addIssue({ code: "custom", message: "A reviewed item or service is required." });
    }
  });

const AnyAiBookingPrefillSchema = z.union([
  SmartScanBookingPrefillSchema,
  NaturalLanguageBookingPrefillSchema,
  z.object({
    version: z.literal(3),
    source: z.literal("natural_language"),
    items: z.record(z.string(), PositiveQuantitySchema).superRefine((items, context) => {
      for (const key of Object.keys(items)) if (!isItemKey(key)) context.addIssue({ code: "custom", message: "Unsupported catalog item." });
    }),
    cleaningService: CleaningServiceSchema.optional(),
    speed: FulfillmentSpeedSchema.optional(),
  }).strict().superRefine((prefill, context) => {
    if (Object.keys(prefill.items).length === 0 && !prefill.cleaningService && !prefill.speed) {
      context.addIssue({ code: "custom", message: "A reviewed item or booking choice is required." });
    }
  }),
  z.object({
    version: z.literal(4),
    source: z.literal("natural_language"),
    items: z.record(z.string(), PositiveQuantitySchema).superRefine((items, context) => {
      for (const key of Object.keys(items)) if (!isItemKey(key)) context.addIssue({ code: "custom", message: "Unsupported catalog item." });
    }),
    cleaningService: CleaningServiceSchema.optional(),
    speed: FulfillmentSpeedSchema.optional(),
    pickupDate: z.string().date().optional(),
    pickupSlot: PickupSlotSchema.optional(),
  }).strict().superRefine((prefill, context) => {
    if (Object.keys(prefill.items).length === 0 && !prefill.cleaningService && !prefill.speed && !prefill.pickupDate && !prefill.pickupSlot) {
      context.addIssue({ code: "custom", message: "A reviewed item or booking choice is required." });
    }
  }),
]);

const isPositiveQuantity = (value: unknown): value is number =>
  PositiveQuantitySchema.safeParse(value).success;

export const createBookingReviewItems = (
  result: GarmentRecognitionResult | NaturalLanguageBookingResult
): BookingReviewItem[] => {
  const detections = "detections" in result ? result.detections : result.items;
  return detections.map((detection, index) => {
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
};

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

const buildCompactReviewedItems = (reviewItems: BookingReviewItem[]) =>
  reviewItems.reduce<Partial<Record<(typeof itemKeys)[number], number>>>((aggregate, item) => {
    if (!item.removed && item.catalogItemId && isPositiveQuantity(item.quantity)) {
      aggregate[item.catalogItemId] = (aggregate[item.catalogItemId] ?? 0) + item.quantity;
    }
    return aggregate;
  }, {});

export type NaturalLanguagePrefillBuildResult = {
  prefill: NaturalLanguageBookingPrefillV4 | null;
  unresolvedQuantityItemIds: string[];
};

/**
 * A non-null normalized value is review-selected only when its corresponding
 * field is not unresolved. The backend normalizer also clears contradictory
 * values, keeping this client guard deliberately defensive.
 */
export const getDefaultNaturalLanguageBookingSelections = (
  result: NaturalLanguageBookingResult | null
): {
  cleaningService?: "wash" | "dry";
  speed?: "standard" | "express";
  pickupDate?: string;
  pickupSlot?: NaturalLanguageBookingPrefillV4["pickupSlot"];
} => {
  if (!result) return {};
  return {
    ...(result.cleaningService && !result.unresolvedFields.includes("cleaning_service")
      ? { cleaningService: result.cleaningService }
      : {}),
    ...(result.speed && !result.unresolvedFields.includes("speed")
      ? { speed: result.speed }
      : {}),
    ...(result.pickupDate && !result.unresolvedFields.includes("pickup_date")
      ? { pickupDate: result.pickupDate }
      : {}),
    ...(result.pickupSlot && !result.unresolvedFields.includes("pickup_slot") && isPickupSlot(result.pickupSlot)
      ? { pickupSlot: result.pickupSlot }
      : {}),
  };
};

/** Builds V4 only from reviewed values; it never carries raw AI scheduling text. */
export const buildNaturalLanguageBookingPrefill = (
  reviewItems: BookingReviewItem[],
  acceptedCleaningService?: NaturalLanguageBookingPrefillV3["cleaningService"],
  acceptedSpeed?: NaturalLanguageBookingPrefillV3["speed"],
  acceptedPickupDate?: NaturalLanguageBookingPrefillV4["pickupDate"],
  acceptedPickupSlot?: NaturalLanguageBookingPrefillV4["pickupSlot"]
): NaturalLanguagePrefillBuildResult => {
  const unresolvedQuantityItemIds = reviewItems
    .filter((item) => !item.removed && item.catalogItemId && !isPositiveQuantity(item.quantity))
    .map((item) => item.id);

  if (unresolvedQuantityItemIds.length > 0) {
    return { prefill: null, unresolvedQuantityItemIds };
  }

  const items = buildCompactReviewedItems(reviewItems);
  if (Object.keys(items).length === 0 && !acceptedCleaningService && !acceptedSpeed && !acceptedPickupDate && !acceptedPickupSlot) {
    return { prefill: null, unresolvedQuantityItemIds: [] };
  }

  const parsed = AnyAiBookingPrefillSchema.safeParse({
    version: 4,
    source: "natural_language",
    items,
    ...(acceptedCleaningService ? { cleaningService: acceptedCleaningService } : {}),
    ...(acceptedSpeed ? { speed: acceptedSpeed } : {}),
    ...(acceptedPickupDate ? { pickupDate: acceptedPickupDate } : {}),
    ...(acceptedPickupSlot ? { pickupSlot: acceptedPickupSlot } : {}),
  });

  return parsed.success
    ? { prefill: parsed.data as NaturalLanguageBookingPrefillV4, unresolvedQuantityItemIds: [] }
    : { prefill: null, unresolvedQuantityItemIds: [] };
};

export const serializeNaturalLanguageBookingPrefill = (prefill: NaturalLanguageBookingPrefillV4): string =>
  JSON.stringify(AnyAiBookingPrefillSchema.parse(prefill));

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

export type HydratedAiBookingPrefill = {
  items: ItemState;
  cleaningService?: "wash" | "dry";
  speed?: "standard" | "express";
  pickupDate?: string;
  pickupSlot?: NaturalLanguageBookingPrefillV4["pickupSlot"];
};

/** Validates either approved compact version before applying it to booking controls. */
export const hydrateAiBookingPrefill = (
  value: string | string[] | undefined
): HydratedAiBookingPrefill | null => {
  if (typeof value !== "string") return null;
  try {
    const parsed = AnyAiBookingPrefillSchema.safeParse(JSON.parse(value));
    if (!parsed.success) return null;
    return {
      items: { ...initialItems, ...parsed.data.items },
      ...(parsed.data.source === "natural_language" && parsed.data.version === 2
        ? parsed.data.service === "express"
          ? { speed: "express" as const }
          : parsed.data.service
            ? { cleaningService: parsed.data.service, speed: "standard" as const }
            : {}
        : {}),
      ...(parsed.data.source === "natural_language" && parsed.data.version === 3
        ? {
            ...(parsed.data.cleaningService ? { cleaningService: parsed.data.cleaningService } : {}),
            ...(parsed.data.speed ? { speed: parsed.data.speed } : {}),
          }
        : {}),
      ...(parsed.data.source === "natural_language" && parsed.data.version === 4
        ? {
            ...(parsed.data.cleaningService ? { cleaningService: parsed.data.cleaningService } : {}),
            ...(parsed.data.speed ? { speed: parsed.data.speed } : {}),
            ...(parsed.data.pickupDate ? { pickupDate: parsed.data.pickupDate } : {}),
            ...(parsed.data.pickupSlot ? { pickupSlot: parsed.data.pickupSlot } : {}),
          }
        : {}),
    };
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

export const shouldApplyAiBookingPrefill = (
  lastAppliedRouteValue: string | null,
  routeValue: string | string[] | undefined,
  hydratedPrefill: HydratedAiBookingPrefill | null
): routeValue is string =>
  typeof routeValue === "string" && hydratedPrefill !== null && routeValue !== lastAppliedRouteValue;
