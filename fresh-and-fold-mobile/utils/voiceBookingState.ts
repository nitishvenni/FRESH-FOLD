export type VoiceBookingState = "idle" | "requesting_permission" | "listening" | "stopping" | "transcript_ready";

export const MAX_VOICE_BOOKING_TRANSCRIPT_LENGTH = 1_000;

export const isVoiceListening = (state: VoiceBookingState): boolean =>
  state === "listening" || state === "stopping";

export const canStartVoiceRecognition = (state: VoiceBookingState, processing: boolean): boolean =>
  !processing && state !== "requesting_permission" && state !== "listening" && state !== "stopping";

export const canSubmitVoiceTranscript = (transcript: string, state: VoiceBookingState, processing: boolean): boolean =>
  !processing && !isVoiceListening(state) && transcript.trim().length > 0 && transcript.trim().length <= MAX_VOICE_BOOKING_TRANSCRIPT_LENGTH;

export const shouldCancelVoiceRecognitionForAppState = (state: VoiceBookingState, appState: string): boolean =>
  // Permission prompts can transiently move Android/iOS out of "active". They
  // are not a real background transition and must not abort the pending start.
  appState === "background" && (state === "listening" || state === "stopping");
