import { describe, expect, it } from "vitest";
import { ORDER_STATUSES, canTransitionOrderStatus, isOrderStatus, nextOrderStatus } from "../../src/booking/orderStatus";

describe("admin order status lifecycle", () => {
  it("allows idempotent and immediate forward transitions only", () => {
    expect(canTransitionOrderStatus("Scheduled", "Scheduled")).toBe(true);
    expect(canTransitionOrderStatus("Scheduled", "Received at Facility")).toBe(true);
    expect(canTransitionOrderStatus("Washing", "Ironing")).toBe(true);
  });

  it("rejects unknown, skipped, backward, and terminal transitions", () => {
    expect(isOrderStatus("Cancelled")).toBe(false);
    expect(canTransitionOrderStatus("Scheduled", "Washing")).toBe(false);
    expect(canTransitionOrderStatus("Delivered", "Out for Delivery")).toBe(false);
    expect(canTransitionOrderStatus("Delivered", "Delivered")).toBe(true);
  });

  it("has the existing canonical lifecycle and a protected terminal state", () => {
    expect(ORDER_STATUSES).toEqual(["Scheduled", "Received at Facility", "Picked Up", "Washing", "Ironing", "Out for Delivery", "Delivered"]);
    expect(nextOrderStatus("Delivered")).toBeNull();
  });
});
