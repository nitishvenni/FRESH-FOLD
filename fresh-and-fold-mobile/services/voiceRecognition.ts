import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionErrorCode,
  type ExpoSpeechRecognitionResultEvent,
} from "expo-speech-recognition";

export const VOICE_BOOKING_LOCALE = "en-IN";

export type VoiceRecognitionError =
  | "permission_denied"
  | "microphone_unavailable"
  | "recognition_failed"
  | "empty_transcript"
  | "network_failed";

type VoiceRecognitionHandlers = {
  onStart: () => void;
  onEnd: () => void;
  onResult: (event: ExpoSpeechRecognitionResultEvent) => void;
  onError: (error: VoiceRecognitionError) => void;
};

type Subscription = { remove: () => void };

const toSafeError = (code: ExpoSpeechRecognitionErrorCode): VoiceRecognitionError | null => {
  switch (code) {
    case "aborted":
      return null;
    case "not-allowed":
      return "permission_denied";
    case "service-not-allowed":
    case "audio-capture":
    case "language-not-supported":
    case "busy":
      return "microphone_unavailable";
    case "network":
      return "network_failed";
    case "no-speech":
    case "speech-timeout":
      return "empty_transcript";
    default:
      return "recognition_failed";
  }
};

/**
 * Native speech adapter for Voice Booking. It intentionally exposes only
 * transient recognition controls and never persists or transmits audio.
 */
export const voiceRecognition = {
  async requestPermission(): Promise<boolean> {
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return permission.granted;
  },

  isAvailable(): boolean {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  },

  start(): void {
    ExpoSpeechRecognitionModule.start({
      lang: VOICE_BOOKING_LOCALE,
      interimResults: true,
      maxAlternatives: 1,
      continuous: false,
      requiresOnDeviceRecognition: false,
    });
  },

  stop(): void {
    ExpoSpeechRecognitionModule.stop();
  },

  cancel(): void {
    ExpoSpeechRecognitionModule.abort();
  },

  subscribe(handlers: VoiceRecognitionHandlers): () => void {
    const subscriptions: Subscription[] = [
      ExpoSpeechRecognitionModule.addListener("start", handlers.onStart),
      ExpoSpeechRecognitionModule.addListener("end", handlers.onEnd),
      ExpoSpeechRecognitionModule.addListener("result", handlers.onResult),
      ExpoSpeechRecognitionModule.addListener("error", (event) => {
        const error = toSafeError(event.error);
        if (error) handlers.onError(error);
      }),
    ];

    return () => subscriptions.forEach((subscription) => subscription.remove());
  },
};

export const voiceRecognitionMessage: Record<VoiceRecognitionError, string> = {
  permission_denied: "Microphone and speech recognition permission are needed to use Voice Booking.",
  microphone_unavailable: "Speech recognition is unavailable on this device right now.",
  recognition_failed: "We could not recognize that request. Please try again or type it instead.",
  empty_transcript: "We did not hear a booking request. Try again and speak clearly.",
  network_failed: "Speech recognition could not connect. Check your connection and try again.",
};
