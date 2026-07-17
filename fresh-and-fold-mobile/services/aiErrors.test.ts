import { describe, expect, it } from "vitest";
import { parseAiErrorResponse, toAiDevelopmentDiagnostic } from "./aiErrors";

describe("AI service error diagnostics", () => {
  it("preserves a standard AI error contract", () => {
    const error = parseAiErrorResponse(
      {
        code: "AI_TIMEOUT",
        message: "The AI request timed out. Please try again.",
        retryable: true,
        requestId: "body_request_123",
      },
      { status: 504, requestId: "header_request_123" }
    );

    expect(error).toMatchObject({
      code: "AI_TIMEOUT",
      status: 504,
      requestId: "body_request_123",
      retryable: true,
    });
  });

  it("preserves status and request ID for a non-standard JSON error without trusting its message", () => {
    const error = parseAiErrorResponse(
      { message: "provider internal response: secret detail", detail: "raw provider payload" },
      { status: 502, requestId: "header_request_456" }
    );

    expect(error).toMatchObject({
      code: "AI_REQUEST_FAILED",
      status: 502,
      requestId: "header_request_456",
      message: "AI request failed. Please try again.",
      retryable: true,
    });
    expect(error.message).not.toContain("secret detail");
  });

  it("preserves status and request ID for a non-JSON or HTML error response", () => {
    const error = parseAiErrorResponse(undefined, {
      status: 413,
      requestId: "proxy_request_789",
    });

    expect(error).toMatchObject({
      code: "AI_REQUEST_FAILED",
      status: 413,
      requestId: "proxy_request_789",
    });
  });

  it("handles a 401 with a safe authentication message while preserving correlation data", () => {
    const error = parseAiErrorResponse(
      { message: "Invalid token" },
      { status: 401, requestId: "auth_request_123" }
    );

    expect(error).toMatchObject({
      code: "AI_REQUEST_FAILED",
      status: 401,
      requestId: "auth_request_123",
      retryable: false,
      message: "Your session has expired. Please sign in again.",
    });
  });

  it("returns a safe development diagnostic with no raw response data", () => {
    const diagnostic = toAiDevelopmentDiagnostic(
      parseAiErrorResponse(
        { message: "raw provider response that must not be exposed" },
        { status: 503, requestId: "safe_request_123" }
      )
    );

    expect(diagnostic).toEqual({
      code: "AI_REQUEST_FAILED",
      status: 503,
      requestId: "safe_request_123",
      message: "AI request failed. Please try again.",
    });
    expect(JSON.stringify(diagnostic)).not.toContain("raw provider response");
  });
});
