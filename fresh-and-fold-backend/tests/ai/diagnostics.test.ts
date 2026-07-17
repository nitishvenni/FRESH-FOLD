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
      validationCategory: "success",
    });
  });
});
