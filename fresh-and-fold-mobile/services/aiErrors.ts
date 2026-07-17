import type { AiErrorCode, AiErrorResponse } from "../types/ai";

const AI_ERROR_CODES: readonly AiErrorCode[] = [
  "AI_NOT_CONFIGURED",
  "AI_RATE_LIMITED",
  "AI_INVALID_IMAGE",
  "AI_IMAGE_TOO_LARGE",
  "AI_UNSUPPORTED_IMAGE",
  "AI_TIMEOUT",
  "AI_PROVIDER_UNAVAILABLE",
  "AI_INVALID_PROVIDER_RESPONSE",
];

const isAiErrorCode = (value: unknown): value is AiErrorCode =>
  typeof value === "string" && AI_ERROR_CODES.includes(value as AiErrorCode);

export class AiServiceError extends Error {
  readonly code: AiErrorCode | "AI_REQUEST_FAILED";
  readonly retryable: boolean;
  readonly requestId?: string;
  readonly status?: number;

  constructor(
    message: string,
    options: {
      code: AiErrorCode | "AI_REQUEST_FAILED";
      retryable: boolean;
      requestId?: string;
      status?: number;
    }
  ) {
    super(message);
    this.name = "AiServiceError";
    this.code = options.code;
    this.retryable = options.retryable;
    this.requestId = options.requestId;
    this.status = options.status;
  }
}

export type AiErrorResponseMetadata = {
  status?: number;
  requestId?: string;
};

/**
 * Accepts only the known backend AI contract. Unknown response bodies are
 * deliberately not surfaced, while status and request ID remain available for
 * development diagnostics.
 */
export const parseAiErrorResponse = (
  payload: unknown,
  metadata: AiErrorResponseMetadata = {}
): AiServiceError => {
  const body = (payload || {}) as Partial<AiErrorResponse>;
  if (isAiErrorCode(body.code) && typeof body.message === "string") {
    return new AiServiceError(body.message, {
      code: body.code,
      retryable: body.retryable === true,
      requestId: typeof body.requestId === "string" ? body.requestId : metadata.requestId,
      status: metadata.status,
    });
  }

  if (metadata.status === 401) {
    return new AiServiceError("Your session has expired. Please sign in again.", {
      code: "AI_REQUEST_FAILED",
      retryable: false,
      requestId: metadata.requestId,
      status: metadata.status,
    });
  }

  return new AiServiceError("AI request failed. Please try again.", {
    code: "AI_REQUEST_FAILED",
    retryable: true,
    requestId: metadata.requestId,
    status: metadata.status,
  });
};

export type AiDevelopmentDiagnostic = {
  code: AiErrorCode | "AI_REQUEST_FAILED";
  status?: number;
  requestId?: string;
  message: string;
};

/** Returns only safe fields suitable for a development-build diagnostic panel. */
export const toAiDevelopmentDiagnostic = (error: AiServiceError): AiDevelopmentDiagnostic => ({
  code: error.code,
  ...(typeof error.status === "number" ? { status: error.status } : {}),
  ...(error.requestId ? { requestId: error.requestId } : {}),
  message: error.message,
});
