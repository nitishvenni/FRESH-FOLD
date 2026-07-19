import { OrderRecord } from "../services/orderService";

export const HOME_ORDER_STEPS = [
  "Pickup",
  "Cleaning",
  "Ironing",
  "Out for delivery",
  "Delivered",
] as const;

const statusToStep: Record<string, number> = {
  Scheduled: 0,
  "Received at Facility": 0,
  "Picked Up": 0,
  Washing: 1,
  Ironing: 2,
  "Out for Delivery": 3,
  Delivered: 4,
};

const statusLabels: Record<string, string> = {
  Scheduled: "Pickup scheduled",
  "Received at Facility": "At our facility",
  "Picked Up": "Picked up",
  Washing: "Cleaning in progress",
  Ironing: "Ironing in progress",
  "Out for Delivery": "Out for delivery",
  Delivered: "Delivered",
};

export function getHomeOrderStatus(status: string) {
  return {
    currentStep: statusToStep[status] ?? 0,
    label: statusLabels[status] ?? status,
  };
}

export function getOrderItemCount(order: Pick<OrderRecord, "items">) {
  return (order.items || []).reduce((total, item) => total + (Number(item.quantity) || 0), 0);
}

/** New orders keep both dimensions; legacy flattened records remain read-only. */
export function getOrderServiceLabel(order: Pick<OrderRecord, "cleaningService" | "speed" | "service">) {
  if (order.cleaningService && order.speed) {
    return `${order.cleaningService === "dry" ? "Dry Clean" : "Wash & Iron"} · ${order.speed === "express" ? "Express" : "Standard"}`;
  }
  if (order.service === "wash") return "Wash & Iron · Standard";
  if (order.service === "dry") return "Dry Clean · Standard";
  if (order.service === "express") return "Express (Legacy)";
  return "Laundry service";
}

export function getMostRelevantActiveOrder(orders: OrderRecord[]) {
  return orders.find((order) => order.status !== "Delivered") ?? null;
}
