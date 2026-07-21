import { describe, expect, it } from "vitest";
import { ORDER_STATUSES, canTransitionOrderStatus, isOrderStatus, nextOrderStatus } from "../../src/booking/orderStatus";

describe("admin order status lifecycle", () => {
  it("allows idempotent and immediate forward transitions only", () => {
    // Same status
    expect(canTransitionOrderStatus("Scheduled", "Scheduled")).toBe(true);
    expect(canTransitionOrderStatus("Delivered", "Delivered")).toBe(true);
    
    // Correct forward transitions
    expect(canTransitionOrderStatus("Scheduled", "Picked Up")).toBe(true);
    expect(canTransitionOrderStatus("Picked Up", "Received at Facility")).toBe(true);
    expect(canTransitionOrderStatus("Received at Facility", "Washing")).toBe(true);
    expect(canTransitionOrderStatus("Washing", "Ironing")).toBe(true);
    expect(canTransitionOrderStatus("Ironing", "Out for Delivery")).toBe(true);
    expect(canTransitionOrderStatus("Out for Delivery", "Delivered")).toBe(true);
  });

  it("rejects unknown, skipped, backward, and terminal transitions", () => {
    expect(isOrderStatus("Cancelled")).toBe(false);
    
    // Invalid skips
    expect(canTransitionOrderStatus("Scheduled", "Received at Facility")).toBe(false);
    expect(canTransitionOrderStatus("Scheduled", "Washing")).toBe(false);
    expect(canTransitionOrderStatus("Picked Up", "Washing")).toBe(false);

    // Invalid backwards
    expect(canTransitionOrderStatus("Received at Facility", "Picked Up")).toBe(false);
    expect(canTransitionOrderStatus("Delivered", "Out for Delivery")).toBe(false);
  });

  it("has the existing canonical lifecycle and a protected terminal state", () => {
    expect(ORDER_STATUSES).toEqual(["Scheduled", "Picked Up", "Received at Facility", "Washing", "Ironing", "Out for Delivery", "Delivered"]);
    expect(nextOrderStatus("Delivered")).toBeNull();
  });
});
