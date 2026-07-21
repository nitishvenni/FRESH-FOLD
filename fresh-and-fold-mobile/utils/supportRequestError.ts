import { ApiRequestError } from "./apiError";

export const supportRequestFailureMessage = (error: unknown): string => {
  if (error instanceof Error && error.message === "SESSION_EXPIRED") {
    return "Your session expired. Please log in again.";
  }
  if (error instanceof ApiRequestError) {
    if (error.status === 429) return "Support is busy right now. Please wait a moment and try again.";
    if (error.status && error.status >= 500) return "Support is temporarily unavailable. Please try again shortly.";
    if (error.status && error.status >= 400) return "We could not send that message. Please try again.";
  }
  return "Network error. Please check your connection and try again.";
};

/** Development-only, allow-listed diagnostics without tokens or ticket content. */
export const logSupportRequestDiagnostic = (stage: string, error: unknown) => {
  if (!__DEV__) return;
  if (error instanceof ApiRequestError) {
    console.info("[support-diagnostic]", { stage, status: error.status, code: error.code });
    return;
  }
  console.info("[support-diagnostic]", { stage, category: "transport_or_unknown" });
};

export const logSupportSocketDiagnostic = (stage: string, category: "connect_error" | "join_rejected" | "missing_token") => {
  if (__DEV__) console.info("[support-diagnostic]", { stage, category });
};
