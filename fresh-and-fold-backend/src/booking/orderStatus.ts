export const ORDER_STATUSES = [
  "Scheduled",
  "Picked Up",
  "Received at Facility",
  "Washing",
  "Ironing",
  "Out for Delivery",
  "Delivered",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);

export const nextOrderStatus = (status: OrderStatus): OrderStatus | null => {
  const index = ORDER_STATUSES.indexOf(status);
  return index >= 0 && index < ORDER_STATUSES.length - 1 ? ORDER_STATUSES[index + 1] : null;
};

/** Status updates are idempotent or one explicit forward lifecycle step only. */
export const canTransitionOrderStatus = (from: unknown, to: unknown): boolean =>
  isOrderStatus(from) && isOrderStatus(to) && (from === to || nextOrderStatus(from) === to);
