import { describe, expect, it } from "vitest";
import { countNaturalLanguageCorrections, countSmartScanCorrections } from "./aiInteractionMetrics";

const item = (id: string, quantity: number, removed = false) => ({ id, detectedLabel: id, catalogItemId: "shirt" as const, mappingStatus: "mapped" as const, quantity, confidence: 0.9, removed });

describe("AI interaction review metrics", () => {
  it("counts Smart Scan quantity and removal changes without returning item data", () => {
    expect(countSmartScanCorrections([item("a", 1), item("b", 1)], [item("a", 2), item("b", 1, true)])).toBe(2);
  });
  it("counts reviewed natural-language additions and accepted dimension changes", () => {
    expect(countNaturalLanguageCorrections([item("a", 1)], [item("a", 1), item("manual:jeans", 1)], "wash", "dry", undefined, "express")).toBe(3);
  });
});
