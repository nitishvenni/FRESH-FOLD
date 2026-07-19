import { describe, expect, it } from "vitest";
import { ambiguousStainDisclaimer, formatStainLabel } from "./stainPresentation";

describe("stain presentation", () => {
  it("keeps blood wording cautious", () => {
    expect(formatStainLabel("blood")).toBe("Possible blood-like stain");
  });

  it("explains that ambiguous candidates are advisory visual possibilities", () => {
    expect(ambiguousStainDisclaimer).toBe(
      "Appearance alone may not reliably identify what caused the stain."
    );
  });
});
