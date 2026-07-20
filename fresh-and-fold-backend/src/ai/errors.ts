import { randomUUID } from "crypto";
import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import multer from "multer";
import { logAiDiagnostic } from "./diagnostics";

export const AI_ERROR_CODES = [
  "AI_INVALID_REQUEST",
  "AI_NOT_CONFIGURED",
  "AI_RATE_LIMITED",
  "AI_INVALID_IMAGE",
  "AI_IMAGE_TOO_LARGE",
  "AI_UNSUPPORTED_IMAGE",
  "AI_TIMEOUT",
  "AI_PROVIDER_UNAVAILABLE",
  "AI_INVALID_PROVIDER_RESPONSE",
] as const;

export type AiErrorCode = (typeof AI_ERROR_CODES)[number];

type AiErrorOptions = {
  retryable?: boolean;
};

const defaultMessages: Record<AiErrorCode, string> = {
  AI_INVALID_REQUEST: "Provide a valid booking request.",
  AI_NOT_CONFIGURED: "AI is not configured for this request.",
  AI_RATE_LIMITED: "Too many AI requests. Please try again shortly.",
  AI_INVALID_IMAGE: "Provide exactly one valid image.",
  AI_IMAGE_TOO_LARGE: "The image is larger than the 5 MB limit.",
  AI_UNSUPPORTED_IMAGE: "Use a JPEG, PNG, or WebP image.",
  AI_TIMEOUT: "The AI request timed out. Please try again.",
  AI_PROVIDER_UNAVAILABLE: "AI is temporarily unavailable. Please try again.",
  AI_INVALID_PROVIDER_RESPONSE: "AI returned an invalid result. Please try again.",
};

const defaultRetryable: Record<AiErrorCode, boolean> = {
  AI_INVALID_REQUEST: false,
  AI_NOT_CONFIGURED: false,
  AI_RATE_LIMITED: true,
  AI_INVALID_IMAGE: false,
  AI_IMAGE_TOO_LARGE: false,
  AI_UNSUPPORTED_IMAGE: false,
  AI_TIMEOUT: true,
  AI_PROVIDER_UNAVAILABLE: true,
  AI_INVALID_PROVIDER_RESPONSE: true,
};

export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly retryable: boolean;

  constructor(code: AiErrorCode, options: AiErrorOptions = {}) {
    super(defaultMessages[code]);
    this.name = "AiError";
    this.code = code;
    this.retryable = options.retryable ?? defaultRetryable[code];
  }
}

const isSafeRequestId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{8,100}$/.test(value);

export const getAiRequestId = (res: Response): string => {
  const requestId = res.locals.aiRequestId;
  return isSafeRequestId(requestId) ? requestId : randomUUID();
};

/** Adds an opaque correlation ID for AI responses without logging request contents. */
export const attachAiRequestId = (req: Request, res: Response, next: NextFunction) => {
  const requestedId = req.header("x-request-id");
  const requestId = isSafeRequestId(requestedId) ? requestedId : randomUUID();
  res.locals.aiRequestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
};

export const sendAiError = (res: Response, error: AiError, status: number) => {
  const requestId = getAiRequestId(res);
  res.setHeader("X-Request-Id", requestId);
  return res.status(status).json({
    code: error.code,
    message: error.message,
    retryable: error.retryable,
    requestId,
  });
};

const fromMulterError = (error: multer.MulterError) =>
  new AiError(error.code === "LIMIT_FILE_SIZE" ? "AI_IMAGE_TOO_LARGE" : "AI_INVALID_IMAGE");

const isInvalidJsonBody = (error: unknown): boolean =>
  error instanceof SyntaxError &&
  typeof error === "object" &&
  "status" in error &&
  (error as { status?: unknown }).status === 400 &&
  "body" in error;

/** body-parser uses this safe, structured shape when a JSON body exceeds its limit. */
const isJsonBodyTooLarge = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "status" in error &&
  (error as { status?: unknown }).status === 413 &&
  "type" in error &&
  (error as { type?: unknown }).type === "entity.too.large";

const statusForAiError = (error: AiError): number => {
  switch (error.code) {
    case "AI_IMAGE_TOO_LARGE":
      return 413;
    case "AI_NOT_CONFIGURED":
    case "AI_PROVIDER_UNAVAILABLE":
      return 503;
    case "AI_TIMEOUT":
      return 504;
    case "AI_INVALID_PROVIDER_RESPONSE":
      return 502;
    default:
      return 400;
  }
};

/**
 * Mount this after future capability routes. It intentionally returns only
 * stable, client-safe errors and never includes provider output or image data.
 */
export const aiErrorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AiError) {
    logAiDiagnostic({
      requestId: getAiRequestId(res),
      stage: "response_normalized_failure",
      errorCode: error.code,
    });
    return sendAiError(res, error, statusForAiError(error));
  }

  if (error instanceof multer.MulterError) {
    const aiError = fromMulterError(error);
    logAiDiagnostic({
      requestId: getAiRequestId(res),
      stage: "response_normalized_failure",
      errorCode: aiError.code,
    });
    return sendAiError(res, aiError, statusForAiError(aiError));
  }

  if (isInvalidJsonBody(error)) {
    const aiError = new AiError("AI_INVALID_REQUEST");
    logAiDiagnostic({
      requestId: getAiRequestId(res),
      stage: "response_normalized_failure",
      errorCode: aiError.code,
    });
    return sendAiError(res, aiError, 400);
  }

  if (isJsonBodyTooLarge(error)) {
    const aiError = new AiError("AI_INVALID_REQUEST");
    logAiDiagnostic({
      requestId: getAiRequestId(res),
      stage: "response_normalized_failure",
      errorCode: aiError.code,
    });
    return sendAiError(res, aiError, 413);
  }

  const aiError = new AiError("AI_PROVIDER_UNAVAILABLE");
  logAiDiagnostic({
    requestId: getAiRequestId(res),
    stage: "response_normalized_failure",
    errorCode: aiError.code,
  });
  return sendAiError(res, aiError, 503);
};
