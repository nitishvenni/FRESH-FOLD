import type { BookingReviewItem } from "../types/ai";

const activeItems = (items: readonly BookingReviewItem[]) => items.filter((item) => !item.removed);

/** Counts review changes only; it deliberately never returns the changed values. */
export const countSmartScanCorrections = (
  initial: readonly BookingReviewItem[],
  current: readonly BookingReviewItem[]
): number => {
  const initialById = new Map(initial.map((item) => [item.id, item]));
  return Math.min(50, current.reduce((count, item) => {
    const original = initialById.get(item.id);
    if (!original || !original.catalogItemId) return count;
    if (!original.removed && item.removed) return count + 1;
    return !item.removed && original.quantity !== item.quantity ? count + 1 : count;
  }, 0));
};

export const countNaturalLanguageCorrections = (
  initial: readonly BookingReviewItem[],
  current: readonly BookingReviewItem[],
  initialCleaningService: "wash" | "dry" | undefined,
  currentCleaningService: "wash" | "dry" | undefined,
  initialSpeed: "standard" | "express" | undefined,
  currentSpeed: "standard" | "express" | undefined
): number => {
  const initialById = new Map(initial.map((item) => [item.id, item]));
  let count = 0;
  for (const item of current) {
    const original = initialById.get(item.id);
    if (!original && !item.removed && item.catalogItemId) count += 1;
    else if (original && original.catalogItemId && (!original.removed && item.removed || (!item.removed && original.quantity !== item.quantity))) count += 1;
  }
  if (initialCleaningService !== currentCleaningService) count += 1;
  if (initialSpeed !== currentSpeed) count += 1;
  return Math.min(50, count);
};

export const hasReviewableItems = (items: readonly BookingReviewItem[]) => activeItems(items).length > 0;
