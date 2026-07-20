import { describe, expect, it, vi } from "vitest";
import { reportAiCancellationOnce } from "./aiCancellation";

describe("AI cancellation lifecycle reporting", () => {
  it("emits only one bounded cancelled event for an explicit review discard", () => {
    const report = vi.fn();
    const cancellationRef = { current: false };

    expect(reportAiCancellationOnce("booking_request_123", cancellationRef, report)).toBe(true);
    expect(reportAiCancellationOnce("booking_request_123", cancellationRef, report)).toBe(false);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith({ requestId: "booking_request_123", event: "cancelled" });
  });

  it("does not report local voice cancellation before an AI request exists", () => {
    const report = vi.fn();

    expect(reportAiCancellationOnce(undefined, { current: false }, report)).toBe(false);
    expect(report).not.toHaveBeenCalled();
  });

  it("does not block discard navigation when best-effort analytics throws", () => {
    const report = vi.fn(() => { throw new Error("offline"); });

    expect(() => reportAiCancellationOnce("booking_request_123", { current: false }, report)).not.toThrow();
    expect(report).toHaveBeenCalledWith({ requestId: "booking_request_123", event: "cancelled" });
  });
});
