import { describe, expect, it } from "vitest";
import { mapDetectedGarment, normalizeGarmentLabel } from "../../src/ai/catalog";

describe("garment catalog mapping", () => {
  it.each([
    ["T-Shirt", "tshirt"],
    ["Maroon T-Shirt", "tshirt"],
    ["printed t-shirt", "tshirt"],
    ["folded t-shirt", "tshirt"],
    ["navy folded t-shirt", "tshirt"],
    ["formal white shirt", "shirt"],
    ["short-sleeve patterned shirt", "shirt"],
    ["long-sleeve patterned shirt", "shirt"],
    ["Black Folded Trousers", "trousers"],
    ["blue jeans", "jeans"],
    ["white shirt", "shirt"],
    ["shorts", "shorts"],
    ["black shorts", "shorts"],
    ["leggings", "leggings"],
    ["black leggings", "leggings"],
    ["skirt", "skirt"],
    ["printed skirt", "skirt"],
    ["kurta", "kurta"],
    ["white kurta", "kurta"],
    ["saree", "saree"],
    ["red saree", "saree"],
    ["hoodie", "hoodie"],
    ["black hoodie", "hoodie"],
    ["sweatshirt", "sweater"],
    ["grey sweatshirt", "sweater"],
    ["button-down shirt", "shirt"],
    ["Pillow Case", "pillowcover"],
    ["Comforter", "blanket"],
    ["Blazer", "jacket"],
  ] as const)("maps the approved alias %s to %s", (detectedLabel, catalogItemId) => {
    const mapped = mapDetectedGarment({ detectedLabel, quantity: 1, confidence: 0.9 });
    expect(mapped).toMatchObject({
      detectedLabel,
      catalogItemId,
      mappingStatus: "mapped",
    });
  });

  it.each(["shirt dress", "saree blouse", "silk saree", "suit", "black suit", "shoes", "handbag"])(
    "keeps unsupported label %s unmapped",
    (detectedLabel) => {
      const mapped = mapDetectedGarment({ detectedLabel, quantity: 1, confidence: 0.9 });

      expect(mapped).toMatchObject({
        detectedLabel,
        catalogItemId: null,
        mappingStatus: "unmapped",
      });
    }
  );

  it("preserves unsupported labels without assigning a catalog ID", () => {
    const mapped = mapDetectedGarment({
      detectedLabel: "Silk Saree",
      quantity: 1,
      confidence: 0.82,
    });

    expect(mapped).toEqual({
      detectedLabel: "Silk Saree",
      normalizedLabel: "silk saree",
      quantity: 1,
      confidence: 0.82,
      catalogItemId: null,
      mappingStatus: "unmapped",
    });
  });

  it("normalizes punctuation and whitespace deterministically", () => {
    expect(normalizeGarmentLabel("  T-SHIRT!!! ")).toBe("t shirt");
  });
});
