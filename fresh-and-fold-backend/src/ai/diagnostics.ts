import type { AiErrorCode } from "./errors";

export type AiDiagnosticStage =
  | "ai_route_reached"
  | "image_validation_started"
  | "image_validation_completed"
  | "provider_selected"
  | "provider_request_started"
  | "provider_request_completed"
  | "provider_request_failed"
  | "provider_execution_started"
  | "provider_execution_completed"
  | "provider_execution_failed"
  | "provider_output_validation"
  | "application_zod_validation"
  | "deterministic_mapping_completed"
  | "response_completed"
  | "response_normalized_failure";

export type AiValidationCategory = "success" | "json_parse_failed" | "schema_failed";

export type AiDiagnosticEvent = {
  requestId: string;
  stage: AiDiagnosticStage;
  authenticated?: true;
  imageMimeType?: string;
  imageByteSize?: number;
  provider?: string;
  model?: string;
  configuredTimeoutMs?: number;
  providerStartedAt?: string;
  providerFinishedAt?: string;
  elapsedMs?: number;
  errorCode?: AiErrorCode;
  normalizedErrorCode?: AiErrorCode;
  rawErrorName?: string;
  validationCategory?: AiValidationCategory;
};

const SAFE_RAW_ERROR_NAMES = new Set([
  "AbortError",
  "TimeoutError",
  "APIConnectionTimeoutError",
  "APIUserAbortError",
  "RequestTimeoutError",
  "RequestAbortedError",
  "APIConnectionError",
  "RateLimitError",
  "InternalServerError",
  "AuthenticationError",
  "PermissionDeniedError",
  "BadRequestError",
  "NotFoundError",
  "ConflictError",
  "UnprocessableEntityError",
  "APIError",
  "Error",
]);

/** Returns only a pre-approved provider error class, never an error message. */
export const toSafeRawErrorName = (error: unknown): string | undefined => {
  const name = error instanceof Error ? error.name : "";
  return SAFE_RAW_ERROR_NAMES.has(name) ? name : undefined;
};

/**
 * Emits only an allow-listed, correlation-safe AI pipeline event. Do not add
 * request bodies, image data, provider responses, secrets, or exception text.
 */
export const logAiDiagnostic = (event: AiDiagnosticEvent): void => {
  const safeEvent: AiDiagnosticEvent = {
    requestId: event.requestId,
    stage: event.stage,
    ...(event.authenticated ? { authenticated: true } : {}),
    ...(event.imageMimeType ? { imageMimeType: event.imageMimeType } : {}),
    ...(typeof event.imageByteSize === "number" ? { imageByteSize: event.imageByteSize } : {}),
    ...(event.provider ? { provider: event.provider } : {}),
    ...(event.model ? { model: event.model } : {}),
    ...(typeof event.configuredTimeoutMs === "number" ? { configuredTimeoutMs: event.configuredTimeoutMs } : {}),
    ...(event.providerStartedAt ? { providerStartedAt: event.providerStartedAt } : {}),
    ...(event.providerFinishedAt ? { providerFinishedAt: event.providerFinishedAt } : {}),
    ...(typeof event.elapsedMs === "number" ? { elapsedMs: event.elapsedMs } : {}),
    ...(event.errorCode ? { errorCode: event.errorCode } : {}),
    ...(event.normalizedErrorCode ? { normalizedErrorCode: event.normalizedErrorCode } : {}),
    ...(event.rawErrorName && SAFE_RAW_ERROR_NAMES.has(event.rawErrorName)
      ? { rawErrorName: event.rawErrorName }
      : {}),
    ...(event.validationCategory ? { validationCategory: event.validationCategory } : {}),
  };

  console.info("[ai-diagnostic]", JSON.stringify(safeEvent));
};

export const toDiagnosticAiErrorCode = (error: unknown): AiErrorCode =>
  error instanceof Error && "code" in error && typeof error.code === "string"
    ? (error.code as AiErrorCode)
    : "AI_PROVIDER_UNAVAILABLE";
