import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { parseNaturalLanguageBooking } from "../services/aiService";
import { BookingSubmissionError, toBookingSubmissionError } from "../utils/bookingSubmissionError";

export type { BookingSubmissionError } from "../utils/bookingSubmissionError";

const isAbortError = (error: unknown) => error instanceof Error && error.name === "AbortError";

/**
 * Shared, provider-agnostic Phase G submission behavior for typed and spoken
 * booking text. It only submits reviewed text to the existing endpoint.
 */
export const useNaturalLanguageBookingSubmission = () => {
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<BookingSubmissionError | null>(null);

  const cancel = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setProcessing(false);
  };

  useEffect(() => cancel, []);

  const clearError = () => setError(null);

  const submit = async (requestText: string) => {
    if (processing) return;

    setError(null);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setProcessing(true);

    try {
      const result = await parseNaturalLanguageBooking(requestText, controller.signal);
      if (!controller.signal.aborted) {
        router.replace({
          pathname: "/ai-booking-review" as never,
          params: { result: JSON.stringify(result) },
        });
      }
    } catch (requestError) {
      if (!isAbortError(requestError)) {
        setError(toBookingSubmissionError(requestError));
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setProcessing(false);
      }
    }
  };

  return { processing, error, submit, cancel, clearError, isDevelopmentBuild: typeof __DEV__ !== "undefined" && __DEV__ };
};
