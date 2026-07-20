import { describe, expect, it } from "vitest";
import { calculateOrderTotals } from "../../src/booking/pricing";
import { addCalendarDays, getBusinessTodayIsoDate, isBookablePickupDate, isCanonicalPickupSlot } from "../../src/booking/schedule";

describe("PaymentIntent frozen booking facts", () => {
  const now = new Date("2026-07-21T18:45:00.000Z");

  it("freezes server-authoritative items and amount rather than a client amount", () => {
    const pricing = calculateOrderTotals([{ itemName: "jacket", quantity: 2 }], "dry", "express");
    expect(pricing).toMatchObject({ cleaningService: "dry", speed: "express", totalAmount: 676 });
    expect(pricing.processedItems).toEqual([{ itemName: "jacket", quantity: 2, price: 338, itemTotal: 676 }]);
  });

  it("permits a schedule only while creating an intent, not as moving reconciliation input", () => {
    const date = addCalendarDays(getBusinessTodayIsoDate(now), 3);
    expect(isBookablePickupDate(date, now)).toBe(true);
    expect(isBookablePickupDate(date, new Date("2026-07-26T18:45:00.000Z"))).toBe(false);
    expect(isCanonicalPickupSlot("12 PM - 3 PM")).toBe(true);
    expect(isCanonicalPickupSlot("2 PM")).toBe(false);
  });
});
