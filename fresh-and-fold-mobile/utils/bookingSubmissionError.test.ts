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

  it("shows a friendly rate-limit message while retaining safe development diagnostics", () => {
    const error = toBookingSubmissionError(new AiServiceError("Too many AI requests. Please try again shortly.", { code: "AI_RATE_LIMITED", retryable: true, status: 429, requestId: "request_123" }));
    expect(error).toMatchObject({ title: "Please wait a moment", message: expect.stringContaining("several AI requests"), retryable: true });
  });
});
