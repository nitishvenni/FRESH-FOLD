import { AiDevelopmentDiagnostic, AiServiceError, toAiDevelopmentDiagnostic } from "../services/aiErrors";

export type BookingSubmissionError = {
  title: string;
  message: string;
  retryable: boolean;
  diagnostic?: AiDevelopmentDiagnostic;
};

const isDevelopmentBuild = typeof __DEV__ !== "undefined" && __DEV__;

/** Safe, shared error presentation for typed and Voice Booking submission. */
export const toBookingSubmissionError = (error: unknown): BookingSubmissionError => {
  if (error instanceof AiServiceError) {
    if (error.code === "AI_NOT_CONFIGURED") {
      return {
        title: "AI booking unavailable",
        message: "Natural-language booking is not configured right now. You can continue with Manual Booking.",
        retryable: false,
      };
    }
    return {
      title: "Booking request could not finish",
      message: error.message,
      retryable: error.retryable,
      ...(isDevelopmentBuild ? { diagnostic: toAiDevelopmentDiagnostic(error) } : {}),
    };
  }

  return {
    title: "Booking request could not finish",
    message: "Please try again or continue with Manual Booking.",
    retryable: true,
  };
};
