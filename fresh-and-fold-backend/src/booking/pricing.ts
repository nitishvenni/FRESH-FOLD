import crypto from "crypto";

export const BASE_ITEM_PRICES: Record<string, number> = {
  shirt: 20, tshirt: 18, jeans: 40, trousers: 35, dress: 60, jacket: 90,
  sweater: 50, shorts: 40, leggings: 45, skirt: 55, kurta: 60, saree: 100,
  hoodie: 90, bedsheet: 70, pillowcover: 20, towel: 22, curtain: 110, blanket: 140,
};

export const CLEANING_MULTIPLIER = { wash: 1, dry: 2.5 } as const;
export const SPEED_MULTIPLIER = { standard: 1, express: 1.5 } as const;

export type CleaningService = keyof typeof CLEANING_MULTIPLIER;
export type FulfillmentSpeed = keyof typeof SPEED_MULTIPLIER;
export type OrderInputItem = { itemName: string; quantity: number };
export type PricedOrderItem = OrderInputItem & { price: number; itemTotal: number };

export const isCleaningService = (value: unknown): value is CleaningService =>
  value === "wash" || value === "dry";

export const isFulfillmentSpeed = (value: unknown): value is FulfillmentSpeed =>
  value === "standard" || value === "express";

const requireCleaningService = (value: unknown): CleaningService => {
  if (!isCleaningService(value)) throw new Error("Invalid cleaning service selected");
  return value;
};

const requireFulfillmentSpeed = (value: unknown): FulfillmentSpeed => {
  if (!isFulfillmentSpeed(value)) throw new Error("Invalid fulfillment speed selected");
  return value;
};

/** Server-authoritative pricing for every new booking and payment operation. */
export const calculateOrderTotals = (
  items: OrderInputItem[],
  cleaningService: unknown,
  speed: unknown,
  deliveryCharge = 25,
  freeDeliveryThreshold = 299
) => {
  if (!Array.isArray(items) || items.length === 0) throw new Error("Items are required");

  const normalizedCleaningService = requireCleaningService(cleaningService);
  const normalizedSpeed = requireFulfillmentSpeed(speed);
  const multiplier = CLEANING_MULTIPLIER[normalizedCleaningService] * SPEED_MULTIPLIER[normalizedSpeed];
  let subtotal = 0;

  const processedItems: PricedOrderItem[] = items.map((item) => {
    const itemName = String(item?.itemName || "").trim().toLowerCase();
    const quantity = Number(item?.quantity);
    if (!itemName || !Number.isInteger(quantity) || quantity <= 0) throw new Error("Invalid item payload");
    const basePrice = BASE_ITEM_PRICES[itemName];
    if (!basePrice) throw new Error(`Unsupported item: ${itemName}`);
    const price = Math.round(basePrice * multiplier);
    const itemTotal = price * quantity;
    subtotal += itemTotal;
    return { itemName, quantity, price, itemTotal };
  });

  const normalizedDeliveryCharge = subtotal < freeDeliveryThreshold ? deliveryCharge : 0;
  return {
    cleaningService: normalizedCleaningService,
    speed: normalizedSpeed,
    processedItems,
    subtotal,
    deliveryCharge: normalizedDeliveryCharge,
    totalAmount: subtotal + normalizedDeliveryCharge,
  };
};

/** Binds both pricing dimensions to payment verification; item order cannot alter it. */
export const buildPaymentContextHash = (params: {
  userId: string;
  addressId: string;
  cleaningService: CleaningService;
  speed: FulfillmentSpeed;
  items: PricedOrderItem[];
  totalAmount: number;
}) => {
  const items = [...params.items]
    .sort((a, b) => a.itemName.localeCompare(b.itemName))
    .map(({ itemName, quantity, price, itemTotal }) => ({ itemName, quantity, price, itemTotal }));
  return crypto.createHash("sha256").update(JSON.stringify({
    userId: params.userId,
    addressId: params.addressId,
    cleaningService: params.cleaningService,
    speed: params.speed,
    items,
    totalAmount: params.totalAmount,
  })).digest("hex");
};

export const getLegacyServiceDisplay = (service: unknown): string => {
  if (service === "wash") return "Wash & Iron · Standard";
  if (service === "dry") return "Dry Clean · Standard";
  if (service === "express") return "Express (Legacy)";
  return "Laundry service";
};
