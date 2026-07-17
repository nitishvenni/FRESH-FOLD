import type { AiErrorCode } from "./errors";

export type AiDiagnosticStage =
  | "ai_route_reached"
  | "image_validation_started"
  | "image_validation_completed"
  | "provider_selected"
  | "provider_request_started"
  | "provider_request_completed"
  | "provider_request_failed"
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
  errorCode?: AiErrorCode;
  validationCategory?: AiValidationCategory;
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
    ...(event.errorCode ? { errorCode: event.errorCode } : {}),
    ...(event.validationCategory ? { validationCategory: event.validationCategory } : {}),
  };

  console.info("[ai-diagnostic]", JSON.stringify(safeEvent));
};

export const toDiagnosticAiErrorCode = (error: unknown): AiErrorCode =>
  error instanceof Error && "code" in error && typeof error.code === "string"
    ? (error.code as AiErrorCode)
    : "AI_PROVIDER_UNAVAILABLE";
