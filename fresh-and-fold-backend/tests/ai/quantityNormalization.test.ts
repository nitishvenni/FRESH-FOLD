import { describe, expect, it } from "vitest";
import { normalizeQuantityHomophonesForParsing } from "../../src/ai/quantityNormalization";

describe("contextual booking quantity homophones", () => {
  it.each([
    ["Wash to shirts", "Wash two shirts"],
    ["Wash too shirts", "Wash two shirts"],
    ["Dry clean for jackets", "Dry clean four jackets"],
    ["Send two shirts and for jackets", "Send two shirts and four jackets"],
  ])("normalizes %s only before a supported garment", (input, expected) => {
    expect(normalizeQuantityHomophonesForParsing(input)).toBe(expected);
  });

  it.each([
    "Send this to dry cleaning",
    "Book for tomorrow",
    "Use express for two jackets",
    "Dry clean to unknown-garment",
  ])("keeps non-garment contexts unchanged: %s", (input) => {
    expect(normalizeQuantityHomophonesForParsing(input)).toBe(input);
  });
});
