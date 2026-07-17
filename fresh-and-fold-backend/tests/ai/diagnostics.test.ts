import { afterEach, describe, expect, it, vi } from "vitest";
import { logAiDiagnostic } from "../../src/ai/diagnostics";

describe("AI pipeline diagnostics", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits only the allow-listed diagnostic fields", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logAiDiagnostic({
      requestId: "scan_request_123",
      stage: "image_validation_completed",
      authenticated: true,
      imageMimeType: "image/jpeg",
      imageByteSize: 123_456,
      provider: "gemini",
      model: "gemini-test-model",
      configuredTimeoutMs: 90_000,
      providerStartedAt: "2026-07-17T10:00:00.000Z",
      providerFinishedAt: "2026-07-17T10:01:30.000Z",
      elapsedMs: 90_000,
      normalizedErrorCode: "AI_TIMEOUT",
      rawErrorName: "TimeoutError",
      validationCategory: "success",
      // Simulates accidental caller data; the logger must not serialize it.
      rawImage: "base64-image-data",
      authorization: "Bearer secret-token",
    } as unknown as Parameters<typeof logAiDiagnostic>[0]);

    expect(info).toHaveBeenCalledTimes(1);
    const [prefix, serializedEvent] = info.mock.calls[0];
    expect(prefix).toBe("[ai-diagnostic]");
    expect(typeof serializedEvent).toBe("string");
    expect(serializedEvent).not.toContain("base64-image-data");
    expect(serializedEvent).not.toContain("secret-token");
    expect(JSON.parse(serializedEvent as string)).toEqual({
      requestId: "scan_request_123",
      stage: "image_validation_completed",
      authenticated: true,
      imageMimeType: "image/jpeg",
      imageByteSize: 123_456,
      provider: "gemini",
      model: "gemini-test-model",
      configuredTimeoutMs: 90_000,
      providerStartedAt: "2026-07-17T10:00:00.000Z",
      providerFinishedAt: "2026-07-17T10:01:30.000Z",
      elapsedMs: 90_000,
      normalizedErrorCode: "AI_TIMEOUT",
      rawErrorName: "TimeoutError",
      validationCategory: "success",
    });
  });

  it("drops unapproved raw error names while retaining the normalized code", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logAiDiagnostic({
      requestId: "scan_request_456",
      stage: "provider_execution_failed",
      provider: "gemini",
      model: "gemini-test-model",
      configuredTimeoutMs: 90_000,
      normalizedErrorCode: "AI_PROVIDER_UNAVAILABLE",
      rawErrorName: "Provider response leaked a secret",
    });

    const [, serializedEvent] = info.mock.calls[0];
    expect(serializedEvent).not.toContain("leaked a secret");
    expect(JSON.parse(serializedEvent as string)).toEqual({
      requestId: "scan_request_456",
      stage: "provider_execution_failed",
      provider: "gemini",
      model: "gemini-test-model",
      configuredTimeoutMs: 90_000,
      normalizedErrorCode: "AI_PROVIDER_UNAVAILABLE",
    });
  });
});
