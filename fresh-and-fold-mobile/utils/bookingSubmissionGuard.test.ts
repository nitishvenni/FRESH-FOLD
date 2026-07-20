import { describe, expect, it } from "vitest";
import { canStartBookingSubmission } from "./bookingSubmissionGuard";

describe("booking submission guard", () => {
  it("allows one submission and rejects duplicate taps while it is pending", () => {
    expect(canStartBookingSubmission(false)).toBe(true);
    expect(canStartBookingSubmission(true)).toBe(false);
  });
});
