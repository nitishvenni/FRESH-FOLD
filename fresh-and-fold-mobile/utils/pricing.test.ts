import { describe, expect, it } from "vitest";
import { calculateSubtotal, getItemPriceForService, ITEM_PRICES } from "./pricing";

describe("Phase G.1 mobile provisional pricing", () => {
  it("uses the approved base catalog prices", () => {
    expect(ITEM_PRICES).toMatchObject({ shorts: 40, leggings: 45, skirt: 55, kurta: 60, saree: 100, hoodie: 90, sweater: 50 });
  });

  it.each([
    ["wash standard", "wash", "standard", 40],
    ["wash express", "wash", "express", 60],
    ["dry standard", "dry", "standard", 100],
    ["dry express", "dry", "express", 150],
  ] as const)("mirrors the provisional formula for %s", (_name, cleaningService, speed, expected) => {
    expect(getItemPriceForService("jeans", cleaningService, speed)).toBe(expected);
  });

  it("sums quantities using both independent dimensions", () => {
    expect(calculateSubtotal({ shirt: 2, jacket: 1 }, "dry", "express")).toBe(488);
  });
});
