import type { AiInteractionEvent } from "../services/aiService";

type CancellationRef = { current: boolean };
type CancellationReporter = (event: AiInteractionEvent) => void;

/**
 * Reports a deliberate post-analysis discard at most once for this mounted
 * review screen. The reporter is deliberately best-effort and must never
 * interrupt the customer's navigation if analytics is unavailable.
 */
export const reportAiCancellationOnce = (
  requestId: string | undefined,
  cancellationRef: CancellationRef,
  report: CancellationReporter
): boolean => {
  if (!requestId || cancellationRef.current) return false;

  cancellationRef.current = true;
  try {
    report({ requestId, event: "cancelled" });
  } catch {
    // Analytics reporting is never allowed to block a deliberate discard.
  }
  return true;
};
