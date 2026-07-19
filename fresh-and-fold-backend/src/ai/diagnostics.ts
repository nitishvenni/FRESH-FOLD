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
  | "gemini_json_parse_validation"
  | "gemini_provider_schema_validation"
  | "stain_provider_output_validation"
  | "stain_candidate_normalization"
  | "stain_final_response_validation"
  | "care_label_provider_output_validation"
  | "care_label_normalization"
  | "care_label_final_response_validation"
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
  /** A validated AI analysis status, never an arbitrary provider value. */
  status?: "complete" | "partial" | "no_match" | "unreadable";
  /** Bounded Zod issue metadata; never includes values, messages, or raw output. */
  zodIssuePaths?: string[];
  zodIssueCodes?: string[];
};

const SAFE_ANALYSIS_STATUSES = new Set(["complete", "partial", "no_match", "unreadable"]);
const MAX_ZOD_ISSUES = 10;
const SAFE_ZOD_CODES = new Set([
  "custom",
  "invalid_type",
  "invalid_value",
  "invalid_format",
  "invalid_union",
  "unrecognized_keys",
  "too_big",
  "too_small",
]);
const SAFE_ZOD_PATH_SEGMENT = /^[A-Za-z0-9_]{1,40}$/;

type ZodIssueLike = { code?: unknown; path?: unknown };

/** Returns only bounded Zod issue paths/codes, never values or error text. */
export const toSafeZodIssueDetails = (
  error: unknown
): Pick<AiDiagnosticEvent, "zodIssuePaths" | "zodIssueCodes"> => {
  const issues =
    error && typeof error === "object" && "issues" in error && Array.isArray(error.issues)
      ? (error.issues as ZodIssueLike[])
      : [];
  const paths = new Set<string>();
  const codes = new Set<string>();

  for (const issue of issues.slice(0, MAX_ZOD_ISSUES)) {
    if (typeof issue.code === "string" && SAFE_ZOD_CODES.has(issue.code)) {
      codes.add(issue.code);
    }

    if (!Array.isArray(issue.path) || issue.path.length === 0 || issue.path.length > 8) {
      continue;
    }

    const safePath = issue.path
      .map((segment) =>
        typeof segment === "number" && Number.isInteger(segment) && segment >= 0 && segment <= 99
          ? String(segment)
          : typeof segment === "string" && SAFE_ZOD_PATH_SEGMENT.test(segment)
            ? segment
            : undefined
      )
      .filter((segment): segment is string => Boolean(segment));
    if (safePath.length === issue.path.length) {
      paths.add(safePath.join("."));
    }
  }

  return {
    ...(paths.size > 0 ? { zodIssuePaths: [...paths].slice(0, MAX_ZOD_ISSUES) } : {}),
    ...(codes.size > 0 ? { zodIssueCodes: [...codes].slice(0, MAX_ZOD_ISSUES) } : {}),
  };
};

/** Returns a known analysis status only; arbitrary provider values are omitted. */
export const toSafeAnalysisStatus = (value: unknown): AiDiagnosticEvent["status"] =>
  value &&
  typeof value === "object" &&
  "status" in value &&
  typeof value.status === "string" &&
  SAFE_ANALYSIS_STATUSES.has(value.status)
    ? (value.status as AiDiagnosticEvent["status"])
    : undefined;

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
    ...(event.status && SAFE_ANALYSIS_STATUSES.has(event.status) ? { status: event.status } : {}),
    ...(event.zodIssuePaths
      ? {
          zodIssuePaths: event.zodIssuePaths
            .slice(0, MAX_ZOD_ISSUES)
            .filter((path) =>
              path.split(".").every((segment) =>
                /^\d+$/.test(segment)
                  ? Number(segment) <= 99
                  : SAFE_ZOD_PATH_SEGMENT.test(segment)
              )
            ),
        }
      : {}),
    ...(event.zodIssueCodes
      ? {
          zodIssueCodes: event.zodIssueCodes
            .slice(0, MAX_ZOD_ISSUES)
            .filter((code) => SAFE_ZOD_CODES.has(code)),
        }
      : {}),
  };

  console.info("[ai-diagnostic]", JSON.stringify(safeEvent));
};

export const toDiagnosticAiErrorCode = (error: unknown): AiErrorCode =>
  error instanceof Error && "code" in error && typeof error.code === "string"
    ? (error.code as AiErrorCode)
    : "AI_PROVIDER_UNAVAILABLE";
