import type {
  ExpoSpeechRecognitionErrorCode,
  ExpoSpeechRecognitionNativeEventMap,
  ExpoSpeechRecognitionResultEvent,
} from "expo-speech-recognition";

export const VOICE_BOOKING_LOCALE = "en-IN";

export type VoiceRecognitionError =
  | "development_build_required"
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

export type VoiceDiagnosticStage =
  | "voice_permission_requested"
  | "voice_permission_granted"
  | "voice_permission_denied"
  | "voice_service_available"
  | "voice_service_unavailable"
  | "voice_recognition_started"
  | "voice_recognition_result"
  | "voice_recognition_ended"
  | "voice_recognition_cancelled"
  | "voice_recognition_failed"
  | "voice_screen_mounted"
  | "voice_screen_unmounted"
  | "voice_screen_focused"
  | "voice_screen_blurred"
  | "voice_app_backgrounded"
  | "voice_cleanup_triggered";

export type VoiceCleanupReason = "unmount" | "blur" | "background" | "user_cancel" | "retry" | "new_session";

export const logVoiceDiagnostic = (
  stage: VoiceDiagnosticStage,
  details?: { error?: VoiceRecognitionError; reason?: VoiceCleanupReason }
) => {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.info("[voice-diagnostic]", JSON.stringify({ stage, ...(details?.error ? { error: details.error } : {}), ...(details?.reason ? { reason: details.reason } : {}) }));
  }
};

type SpeechRecognitionModule = {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  isRecognitionAvailable: () => boolean;
  start: (options: {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    continuous: boolean;
    requiresOnDeviceRecognition: boolean;
  }) => void;
  stop: () => void;
  abort: () => void;
  addListener: <K extends keyof ExpoSpeechRecognitionNativeEventMap>(
    eventName: K,
    listener: (event: ExpoSpeechRecognitionNativeEventMap[K]) => void
  ) => Subscription;
};

let cachedSpeechRecognitionModule: SpeechRecognitionModule | null | undefined;

/**
 * The native package cannot load in Expo Go. Delay its runtime import until the
 * Voice Booking screen actually uses recognition so unrelated routes remain
 * available and the screen can show a development-build requirement instead.
 */
const getSpeechRecognitionModule = (): SpeechRecognitionModule | null => {
  if (cachedSpeechRecognitionModule !== undefined) return cachedSpeechRecognitionModule;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nativeModule = require("expo-speech-recognition") as {
      ExpoSpeechRecognitionModule: SpeechRecognitionModule;
    };
    cachedSpeechRecognitionModule = nativeModule.ExpoSpeechRecognitionModule;
  } catch {
    cachedSpeechRecognitionModule = null;
  }

  return cachedSpeechRecognitionModule;
};

/** Test seam for mocked native sessions; never used by application code. */
export const setVoiceRecognitionModuleForTests = (
  module: SpeechRecognitionModule | null | undefined
): void => {
  cachedSpeechRecognitionModule = module;
};

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
  isNativeModuleAvailable(): boolean {
    const available = getSpeechRecognitionModule() !== null;
    if (!available) logVoiceDiagnostic("voice_service_unavailable");
    return available;
  },

  async requestPermission(): Promise<boolean> {
    const module = getSpeechRecognitionModule();
    if (!module) {
      logVoiceDiagnostic("voice_service_unavailable");
      return false;
    }
    logVoiceDiagnostic("voice_permission_requested");
    const permission = await module.requestPermissionsAsync();
    logVoiceDiagnostic(permission.granted ? "voice_permission_granted" : "voice_permission_denied");
    return permission.granted;
  },

  isAvailable(): boolean {
    const available = getSpeechRecognitionModule()?.isRecognitionAvailable() ?? false;
    logVoiceDiagnostic(available ? "voice_service_available" : "voice_service_unavailable");
    return available;
  },

  start(): void {
    const module = getSpeechRecognitionModule();
    if (!module) {
      logVoiceDiagnostic("voice_recognition_failed", { error: "development_build_required" });
      return;
    }
    module.start({
      lang: VOICE_BOOKING_LOCALE,
      interimResults: true,
      maxAlternatives: 1,
      continuous: false,
      requiresOnDeviceRecognition: false,
    });
    logVoiceDiagnostic("voice_recognition_started");
  },

  stop(): void {
    getSpeechRecognitionModule()?.stop();
  },

  cancel(): void {
    getSpeechRecognitionModule()?.abort();
    logVoiceDiagnostic("voice_recognition_cancelled");
  },

  subscribe(handlers: VoiceRecognitionHandlers): () => void {
    const module = getSpeechRecognitionModule();
    if (!module) return () => undefined;

    const subscriptions: Subscription[] = [
      module.addListener("start", handlers.onStart),
      module.addListener("end", () => {
        logVoiceDiagnostic("voice_recognition_ended");
        handlers.onEnd();
      }),
      module.addListener("result", (event) => {
        // Never log the transcript or alternatives; only the lifecycle stage.
        logVoiceDiagnostic("voice_recognition_result");
        handlers.onResult(event);
      }),
      module.addListener("error", (event) => {
        const error = toSafeError(event.error);
        if (error) {
          logVoiceDiagnostic("voice_recognition_failed", { error });
          handlers.onError(error);
        }
      }),
    ];

    return () => subscriptions.forEach((subscription) => subscription.remove());
  },
};

export const voiceRecognitionMessage: Record<VoiceRecognitionError, string> = {
  development_build_required: "Voice Booking requires the Fresh & Fold Development Build. Open the installed development app instead of Expo Go.",
  permission_denied: "Microphone and speech recognition permission are needed to use Voice Booking.",
  microphone_unavailable: "Speech recognition is unavailable on this device right now.",
  recognition_failed: "We could not recognize that request. Please try again or type it instead.",
  empty_transcript: "We did not hear a booking request. Try again and speak clearly.",
  network_failed: "Speech recognition could not connect. Check your connection and try again.",
};
