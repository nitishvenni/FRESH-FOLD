import { describe, expect, it } from "vitest";
import { mapDetectedGarment, normalizeGarmentLabel } from "../../src/ai/catalog";

describe("garment catalog mapping", () => {
  it.each([
    ["T-Shirt", "tshirt"],
    ["tshirt", "tshirt"],
    ["Maroon T-Shirt", "tshirt"],
    ["printed t-shirt", "tshirt"],
    ["folded t-shirt", "tshirt"],
    ["navy folded t-shirt", "tshirt"],
    ["formal white shirt", "shirt"],
    ["shirt", "shirt"],
    ["formal white shirts", "shirt"],
    ["short-sleeve patterned shirt", "shirt"],
    ["long-sleeve patterned shirt", "shirt"],
    ["Black Folded Trousers", "trousers"],
    ["trouser", "trousers"],
    ["blue jeans", "jeans"],
    ["jeans", "jeans"],
    ["white shirt", "shirt"],
    ["shorts", "shorts"],
    ["short", "shorts"],
    ["black shorts", "shorts"],
    ["leggings", "leggings"],
    ["black leggings", "leggings"],
    ["legging", "leggings"],
    ["skirt", "skirt"],
    ["skirts", "skirt"],
    ["printed skirt", "skirt"],
    ["kurta", "kurta"],
    ["kurtas", "kurta"],
    ["white kurta", "kurta"],
    ["saree", "saree"],
    ["sarees", "saree"],
    ["red saree", "saree"],
    ["hoodie", "hoodie"],
    ["black hoodie", "hoodie"],
    ["sweatshirt", "sweater"],
    ["sweater", "sweater"],
    ["grey sweatshirt", "sweater"],
    ["sweaters", "sweater"],
    ["button-down shirt", "shirt"],
    ["shirts", "shirt"],
    ["t-shirts", "tshirt"],
    ["tshirts", "tshirt"],
    ["printed t-shirts", "tshirt"],
    ["jackets", "jacket"],
    ["jacket", "jacket"],
    ["black folded jackets", "jacket"],
    ["hoodies", "hoodie"],
    ["dresses", "dress"],
    ["dress", "dress"],
    ["jean", "jeans"],
    ["bedsheets", "bedsheet"],
    ["bedsheet", "bedsheet"],
    ["pillow cover", "pillowcover"],
    ["pillow covers", "pillowcover"],
    ["pillowcovers", "pillowcover"],
    ["pillowcover", "pillowcover"],
    ["towel", "towel"],
    ["towels", "towel"],
    ["curtain", "curtain"],
    ["curtains", "curtain"],
    ["blanket", "blanket"],
    ["blankets", "blanket"],
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

  it.each(["shirt dress", "saree blouse", "silk saree", "suit", "suits", "black suit", "black suits", "shoe", "shoes", "bags", "handbags", "handbag"])(
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
