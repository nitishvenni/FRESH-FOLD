import { describe, expect, it } from "vitest";
import { ITEM_PRICES, getItemPriceForService } from "./pricing";

describe("Phase C.1 mobile catalog pricing", () => {
  it("uses the approved display prices and existing service multipliers", () => {
    expect(ITEM_PRICES).toMatchObject({
      shorts: 40,
      leggings: 45,
      skirt: 55,
      kurta: 60,
      saree: 100,
      hoodie: 90,
      sweater: 50,
    });
    expect(getItemPriceForService("saree", "dry")).toBe(250);
    expect(getItemPriceForService("hoodie", "express")).toBe(270);
  });
});
