import { OrderRecord } from "../services/orderService";

export const HOME_ORDER_STEPS = [
  "Pickup",
  "Cleaning",
  "Ironing",
  "Out for delivery",
  "Delivered",
] as const;

const homeOrderStatuses: Record<string, { currentStep: number; label: string }> = {
  scheduled: { currentStep: 0, label: "Pickup scheduled" },
  "received at facility": { currentStep: 0, label: "At our facility" },
  "picked up": { currentStep: 0, label: "Picked up" },
  washing: { currentStep: 1, label: "Cleaning in progress" },
  ironing: { currentStep: 2, label: "Ironing in progress" },
  "out for delivery": { currentStep: 3, label: "Out for delivery" },
  delivered: { currentStep: 4, label: "Delivered" },
};

const terminalOrderStatuses = new Set(["delivered", "cancelled"]);

const normalizedStatus = (status: unknown) =>
  typeof status === "string" ? status.trim().toLowerCase() : "";

export type HomeOrderStatus = {
  currentStep: number | null;
  label: string;
  isKnown: boolean;
};

/** Unknown backend states deliberately render without a guessed timeline stage. */
export function getHomeOrderStatus(status: unknown): HomeOrderStatus {
  const knownStatus = homeOrderStatuses[normalizedStatus(status)];
  if (knownStatus) return { ...knownStatus, isKnown: true };

  return { currentStep: null, label: "Status update pending", isKnown: false };
}

export function isTerminalOrderStatus(status: unknown) {
  return terminalOrderStatuses.has(normalizedStatus(status));
}

export function getOrderItemCount(order: Pick<OrderRecord, "items">) {
  return (order.items || []).reduce((total, item) => total + (Number(item.quantity) || 0), 0);
}

/** New orders keep both dimensions; legacy flattened records remain read-only. */
export function getOrderServiceLabel(order: Pick<OrderRecord, "cleaningService" | "speed" | "service">) {
  if (order.cleaningService && order.speed) {
    return `${order.cleaningService === "dry" ? "Dry Clean" : "Wash & Iron"} \u2022 ${order.speed === "express" ? "Express" : "Standard"}`;
  }
  if (order.service === "wash") return "Wash & Iron \u2022 Standard";
  if (order.service === "dry") return "Dry Clean \u2022 Standard";
  if (order.service === "express") return "Express (Legacy)";
  return "Laundry service";
}

export function getMostRelevantActiveOrder(orders: OrderRecord[]) {
  return orders.reduce<OrderRecord | null>((latest, order) => {
    if (isTerminalOrderStatus(order.status)) return latest;
    if (!latest) return order;

    const latestTime = Date.parse(latest.createdAt || "");
    const orderTime = Date.parse(order.createdAt || "");
    return Number.isFinite(orderTime) && (!Number.isFinite(latestTime) || orderTime > latestTime) ? order : latest;
  }, null);
}
