/** Monotonic session IDs make an async permission result safe to ignore. */
export const nextVoiceRecognitionSession = (current: number): number => current + 1;

export const isCurrentVoiceRecognitionSession = (
  current: number,
  expected: number,
  mounted: boolean
): boolean => mounted && current === expected;
