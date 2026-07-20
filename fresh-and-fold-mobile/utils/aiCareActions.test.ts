import { describe, expect, it } from "vitest";
import { AI_CARE_ACTIONS } from "./aiCareActions";

describe("AI Care actions", () => {
  it("keeps garment-care intelligence actions and no typed booking entry point", () => {
    expect(AI_CARE_ACTIONS.map((action) => action.title)).toEqual([
      "Smart Scan", "Stain Detection", "Fabric Identification", "Care Label Reader",
    ]);
    expect(JSON.stringify(AI_CARE_ACTIONS)).not.toMatch(/Describe a Booking|ai-booking/i);
  });
});
