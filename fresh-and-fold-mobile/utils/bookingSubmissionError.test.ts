import { describe, expect, it } from "vitest";
import { AiServiceError } from "../services/aiErrors";
import { toBookingSubmissionError } from "./bookingSubmissionError";

describe("Natural-Language Booking submission reuse", () => {
  it("keeps the existing safe not-configured experience for typed and voice input", () => {
    const error = toBookingSubmissionError(new AiServiceError("Not configured", { code: "AI_NOT_CONFIGURED", retryable: false }));

    expect(error).toMatchObject({ title: "AI booking unavailable", retryable: false });
  });

  it("uses the existing safe fallback for non-AI failures", () => {
    expect(toBookingSubmissionError(new Error("raw failure"))).toEqual({
      title: "Booking request could not finish",
      message: "Please try again or continue with Manual Booking.",
      retryable: true,
    });
  });
});
