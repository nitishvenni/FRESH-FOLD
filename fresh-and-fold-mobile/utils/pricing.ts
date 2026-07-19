import type { ItemKey, ItemState } from "./bookingData";

export const ITEM_PRICES: Record<ItemKey, number> = {
  shirt: 20, tshirt: 18, jeans: 40, trousers: 35, shorts: 40, leggings: 45,
  skirt: 55, dress: 60, kurta: 60, saree: 100, jacket: 90, sweater: 50,
  hoodie: 90, bedsheet: 70, pillowcover: 20, towel: 22, curtain: 110, blanket: 140,
};

export const CLEANING_MULTIPLIERS = { wash: 1, dry: 2.5 } as const;
export const SPEED_MULTIPLIERS = { standard: 1, express: 1.5 } as const;
export type CleaningService = keyof typeof CLEANING_MULTIPLIERS;
export type FulfillmentSpeed = keyof typeof SPEED_MULTIPLIERS;

export const DELIVERY_CHARGE = 25;
export const FREE_DELIVERY_THRESHOLD = 299;

export const isCleaningService = (value: unknown): value is CleaningService => value === "wash" || value === "dry";
export const isFulfillmentSpeed = (value: unknown): value is FulfillmentSpeed => value === "standard" || value === "express";

/** Route values are untrusted strings; manual UI defaults before routing. */
export const getNormalizedCleaningService = (value: unknown): CleaningService => {
  const candidate = Array.isArray(value) ? value[0] : value;
  return isCleaningService(candidate) ? candidate : "wash";
};

export const getNormalizedSpeed = (value: unknown): FulfillmentSpeed => {
  const candidate = Array.isArray(value) ? value[0] : value;
  return isFulfillmentSpeed(candidate) ? candidate : "standard";
};

export const getItemPriceForService = (
  itemKey: ItemKey,
  cleaningService: CleaningService,
  speed: FulfillmentSpeed
) => Math.round((ITEM_PRICES[itemKey] || 0) * CLEANING_MULTIPLIERS[cleaningService] * SPEED_MULTIPLIERS[speed]);

export const calculateSubtotal = (
  items: Partial<ItemState>,
  cleaningService: CleaningService,
  speed: FulfillmentSpeed
) => (Object.keys(items) as ItemKey[]).reduce(
  (sum, key) => sum + getItemPriceForService(key, cleaningService, speed) * Number(items[key] || 0),
  0
);

export const getServiceDisplay = (cleaningService: CleaningService, speed: FulfillmentSpeed) => ({
  cleaningService: cleaningService === "dry" ? "Dry Clean" : "Wash & Iron",
  speed: speed === "express" ? "Express" : "Standard",
});
