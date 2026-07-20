import { describe, expect, it } from "vitest";
import { getHomeOrderStatus, getMostRelevantActiveOrder } from "./orderStatus";

describe("Home order status", () => {
  it("never guesses a timeline stage for an unknown backend status", () => {
    expect(getHomeOrderStatus("Awaiting quality inspection")).toEqual({
      currentStep: null,
      label: "Status update pending",
      isKnown: false,
    });
  });

  it("uses the newest non-terminal order and excludes cancelled orders", () => {
    const activeOrder = { _id: "active", status: "Washing", createdAt: "2026-07-20T10:00:00.000Z" };
    expect(getMostRelevantActiveOrder([
      { _id: "cancelled", status: "Cancelled", createdAt: "2026-07-20T12:00:00.000Z" },
      activeOrder,
      { _id: "older", status: "Scheduled", createdAt: "2026-07-20T09:00:00.000Z" },
      { _id: "delivered", status: "Delivered", createdAt: "2026-07-20T13:00:00.000Z" },
    ])).toBe(activeOrder);
  });
});
