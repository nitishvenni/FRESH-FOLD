import { describe, expect, it } from "vitest";
import { HOME_AI_ACTION_ROUTES } from "./homeAiActionRoutes";

describe("Home AI action routes", () => {
  it("preserves Smart Scan through AI Care and opens the dedicated Voice Booking screen", () => {
    expect(HOME_AI_ACTION_ROUTES).toEqual({
      smartScan: "/ai-care",
      voiceBooking: "/voice-booking",
    });
  });
});
