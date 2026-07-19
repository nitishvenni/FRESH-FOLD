import { describe, expect, it } from "vitest";
import {
  buildPaymentContextHash,
  calculateOrderTotals,
  getLegacyServiceDisplay,
} from "../../src/booking/pricing";

describe("Phase G.1 server-authoritative two-dimension pricing", () => {
  it.each([
    ["wash standard", "wash", "standard", 40],
    ["wash express", "wash", "express", 60],
    ["dry standard", "dry", "standard", 100],
    ["dry express", "dry", "express", 150],
  ] as const)("prices %s from both canonical dimensions", (_name, cleaningService, speed, expectedPrice) => {
    const pricing = calculateOrderTotals([{ itemName: "jeans", quantity: 2 }], cleaningService, speed);
    expect(pricing).toMatchObject({ cleaningService, speed, processedItems: [{ price: expectedPrice, itemTotal: expectedPrice * 2 }] });
  });

  it("rejects invalid dimensions and does not silently apply a default", () => {
    expect(() => calculateOrderTotals([{ itemName: "shirt", quantity: 1 }], "express", "standard")).toThrow("Invalid cleaning service");
    expect(() => calculateOrderTotals([{ itemName: "shirt", quantity: 1 }], "wash", "overnight")).toThrow("Invalid fulfillment speed");
  });

  it("binds cleaning service and speed independently into payment integrity", () => {
    const pricing = calculateOrderTotals([{ itemName: "jacket", quantity: 2 }], "dry", "express");
    const base = { userId: "user", addressId: "address", items: pricing.processedItems, totalAmount: pricing.totalAmount };
    const hash = buildPaymentContextHash({ ...base, cleaningService: "dry", speed: "express" });
    expect(buildPaymentContextHash({ ...base, cleaningService: "wash", speed: "express" })).not.toBe(hash);
    expect(buildPaymentContextHash({ ...base, cleaningService: "dry", speed: "standard" })).not.toBe(hash);
  });

  it("keeps historical flattened express orders explicitly legacy", () => {
    expect(getLegacyServiceDisplay("wash")).toBe("Wash & Iron · Standard");
    expect(getLegacyServiceDisplay("dry")).toBe("Dry Clean · Standard");
    expect(getLegacyServiceDisplay("express")).toBe("Express (Legacy)");
  });
});
