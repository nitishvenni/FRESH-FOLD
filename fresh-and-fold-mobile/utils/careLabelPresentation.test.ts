import { describe, expect, it } from "vitest";
import { careLabelCategoryLabel, careSymbolLabel } from "./careLabelPresentation";

describe("care-label presentation", () => {
  it("uses clear category and conservative symbol labels", () => {
    expect(careLabelCategoryLabel("dry_cleaning")).toBe("Dry cleaning");
    expect(careSymbolLabel("non_chlorine_bleach_only")).toBe("Non-chlorine bleach only");
  });
});
