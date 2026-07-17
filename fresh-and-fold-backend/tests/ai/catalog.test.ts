import { describe, expect, it } from "vitest";
import { mapDetectedGarment, normalizeGarmentLabel } from "../../src/ai/catalog";

describe("garment catalog mapping", () => {
  it.each([
    ["T-Shirt", "tshirt"],
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
