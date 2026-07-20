import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "../components/Card";
import { useAppTheme } from "../hooks/useAppTheme";
import { useNaturalLanguageBookingSubmission } from "../hooks/useNaturalLanguageBookingSubmission";
import { logVoiceDiagnostic, voiceRecognition, voiceRecognitionMessage, type VoiceCleanupReason, type VoiceRecognitionError } from "../services/voiceRecognition";
import {
  MAX_VOICE_BOOKING_TRANSCRIPT_LENGTH,
  canStartVoiceRecognition,
  canSubmitVoiceTranscript,
  isVoiceListening,
  shouldCancelVoiceRecognitionForAppState,
  type VoiceBookingState,
} from "../utils/voiceBookingState";
import { isCurrentVoiceRecognitionSession, nextVoiceRecognitionSession } from "../utils/voiceRecognitionSession";


export default function VoiceBookingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { processing, error: bookingError, submit, cancel: cancelBookingRequest, clearError, isDevelopmentBuild } = useNaturalLanguageBookingSubmission();
  const [voiceState, setVoiceState] = useState<VoiceBookingState>("idle");
  const [transcript, setTranscript] = useState("");
  const [voiceError, setVoiceError] = useState<VoiceRecognitionError | null>(null);
  const voiceStateRef = useRef<VoiceBookingState>("idle");
  const transcriptRef = useRef("");
  const cancelledRef = useRef(false);
  const mountedRef = useRef(false);
  const sessionRef = useRef(0);
  const recognitionStartedRef = useRef(false);

  const updateVoiceState = (state: VoiceBookingState) => {
    voiceStateRef.current = state;
    setVoiceState(state);
  };

  const setTranscriptValue = (value: string) => {
    transcriptRef.current = value;
    setTranscript(value);
  };

  const cancelListening = (reason: VoiceCleanupReason = "user_cancel") => {
    // Invalidate a pending permission request before touching the native module.
    // A permission dialog may resolve after unmount/cancel; it must not start then.
    sessionRef.current = nextVoiceRecognitionSession(sessionRef.current);
    cancelledRef.current = true;
    if (recognitionStartedRef.current) {
      cancelledRef.current = true;
      try {
        voiceRecognition.cancel();
      } catch {
        // Native recognition may already be released while an app-state change is processed.
      }
    }
    recognitionStartedRef.current = false;
    logVoiceDiagnostic("voice_cleanup_triggered", { reason });
    updateVoiceState("idle");
  };

  useEffect(() => {
    mountedRef.current = true;
    logVoiceDiagnostic("voice_screen_mounted");
    const unsubscribe = voiceRecognition.subscribe({
      onStart: () => {
        if (!cancelledRef.current && mountedRef.current) {
          recognitionStartedRef.current = true;
          updateVoiceState("listening");
        }
      },
      onResult: (event) => {
        if (cancelledRef.current) return;
        const nextTranscript = event.results[0]?.transcript ?? "";
        if (nextTranscript) setTranscriptValue(nextTranscript);
        if (event.isFinal && nextTranscript.trim()) updateVoiceState("transcript_ready");
      },
      onEnd: () => {
        recognitionStartedRef.current = false;
        if (cancelledRef.current) return;
        if (voiceStateRef.current === "listening" || voiceStateRef.current === "stopping") {
          updateVoiceState(transcriptRef.current.trim() ? "transcript_ready" : "idle");
          if (!transcriptRef.current.trim()) setVoiceError("empty_transcript");
        }
      },
      onError: (nextError) => {
        if (cancelledRef.current) return;
        setVoiceError(nextError);
        updateVoiceState("idle");
      },
    });

    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (shouldCancelVoiceRecognitionForAppState(voiceStateRef.current, nextState)) {
        logVoiceDiagnostic("voice_app_backgrounded");
        cancelListening("background");
      }
    });

    return () => {
      mountedRef.current = false;
      logVoiceDiagnostic("voice_screen_unmounted");
      cancelListening("unmount");
      unsubscribe();
      appStateSubscription.remove();
      cancelBookingRequest();
    };
  }, []);

  const startListening = async () => {
    if (!canStartVoiceRecognition(voiceStateRef.current, processing)) return;

    const session = nextVoiceRecognitionSession(sessionRef.current);
    sessionRef.current = session;
    clearError();
    setVoiceError(null);
    setTranscriptValue("");
    cancelledRef.current = false;
    updateVoiceState("requesting_permission");

    try {
      if (!voiceRecognition.isNativeModuleAvailable()) {
        setVoiceError("development_build_required");
        updateVoiceState("idle");
        return;
      }
      const granted = await voiceRecognition.requestPermission();
      if (!isCurrentVoiceRecognitionSession(sessionRef.current, session, mountedRef.current)) {
        return;
      }
      if (!granted) {
        setVoiceError("permission_denied");
        updateVoiceState("idle");
        return;
      }
      if (!voiceRecognition.isAvailable()) {
        setVoiceError("microphone_unavailable");
        updateVoiceState("idle");
        return;
      }
      voiceRecognition.start();
      recognitionStartedRef.current = true;
      updateVoiceState("listening");
    } catch {
      if (!isCurrentVoiceRecognitionSession(sessionRef.current, session, mountedRef.current)) return;
      setVoiceError("microphone_unavailable");
      updateVoiceState("idle");
    }
  };

  const stopListening = () => {
    if (voiceStateRef.current !== "listening" || !recognitionStartedRef.current) return;
    updateVoiceState("stopping");
    voiceRecognition.stop();
  };

  const continueToReview = () => {
    const requestText = transcript.trim();
    if (!requestText) {
      setVoiceError("empty_transcript");
      return;
    }
    if (!canSubmitVoiceTranscript(requestText, voiceStateRef.current, processing)) {
      setVoiceError("recognition_failed");
      return;
    }
    clearError();
    void submit(requestText, "voice");
  };

  const listening = isVoiceListening(voiceState);
  const busy = listening || voiceState === "requesting_permission" || processing;
  const safeVoiceMessage = voiceError === "recognition_failed" && transcript.trim().length > MAX_VOICE_BOOKING_TRANSCRIPT_LENGTH
    ? "Your transcript is too long. Shorten it to 1,000 characters before continuing."
    : voiceError ? voiceRecognitionMessage[voiceError] : null;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 18 }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <TouchableOpacity accessibilityRole="button" style={styles.back} onPress={() => router.back()} disabled={busy}>
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Home</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Voice Booking</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Speak your booking request, then review the text before we prepare suggestions.</Text>

        <Card style={[styles.notice, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <MaterialIcons name="privacy-tip" size={22} color={theme.primary} />
          <Text style={[styles.noticeCopy, { color: theme.textMuted }]}>Do not speak addresses, payment details, passwords, or other sensitive information.</Text>
        </Card>

        <Card style={[styles.voiceCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={listening ? "Stop listening" : "Start voice booking"}
            accessibilityState={{ disabled: busy && !listening, busy: listening }}
            disabled={busy && !listening}
            onPress={listening ? stopListening : () => void startListening()}
            style={[styles.microphoneButton, { backgroundColor: listening ? theme.warning : theme.primary, opacity: busy && !listening ? 0.6 : 1 }]}
          >
            {voiceState === "requesting_permission" || voiceState === "stopping" ? <ActivityIndicator color="#FFFFFF" /> : <MaterialIcons name={listening ? "stop" : "mic-none"} size={30} color="#FFFFFF" />}
          </TouchableOpacity>
          <Text style={[styles.voiceTitle, { color: theme.text }]}>{voiceState === "requesting_permission" ? "Requesting permission" : voiceState === "stopping" ? "Finishing your transcript" : listening ? "Listening…" : "Tap to speak"}</Text>
          <Text style={[styles.voiceCopy, { color: theme.textMuted }]}>{listening ? "Speak naturally, then tap Stop when you are done." : "Your words become editable text before any booking request is sent."}</Text>
          {listening ? <View style={styles.listenActions}><TouchableOpacity accessibilityRole="button" onPress={stopListening} style={[styles.outlineButton, { borderColor: theme.border }]}><Text style={[styles.outlineText, { color: theme.text }]}>Stop</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" onPress={() => cancelListening()} style={[styles.outlineButton, { borderColor: theme.border }]}><Text style={[styles.outlineText, { color: theme.text }]}>Cancel</Text></TouchableOpacity></View> : null}
        </Card>

        <Text style={[styles.transcriptLabel, { color: theme.text }]}>I heard</Text>
        <TextInput
          accessibilityLabel="Voice booking transcript"
          editable={!busy}
          multiline
          maxLength={MAX_VOICE_BOOKING_TRANSCRIPT_LENGTH}
          value={transcript}
          onChangeText={(value) => { setTranscriptValue(value); setVoiceError(null); clearError(); }}
          placeholder="Your spoken booking request will appear here. You can edit it before continuing."
          placeholderTextColor={theme.textMuted}
          textAlignVertical="top"
          style={[styles.transcriptInput, { color: theme.text, backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
        />
        <Text style={[styles.counter, { color: theme.textMuted }]}>{transcript.length}/{MAX_VOICE_BOOKING_TRANSCRIPT_LENGTH}</Text>

        {!listening && !processing ? <TouchableOpacity accessibilityRole="button" onPress={() => void startListening()} style={[styles.retryButton, { borderColor: theme.border }]}><MaterialIcons name="refresh" size={18} color={theme.text} /><Text style={[styles.retryText, { color: theme.text }]}>Retry Voice Input</Text></TouchableOpacity> : null}

        {processing ? <Card style={[styles.processingCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}><ActivityIndicator size="large" color={theme.primary} /><Text style={[styles.processingTitle, { color: theme.text }]}>Preparing your review</Text><Text style={[styles.processingCopy, { color: theme.textMuted }]}>This is a suggestion only. It does not create a booking.</Text><TouchableOpacity accessibilityRole="button" onPress={cancelBookingRequest} style={[styles.outlineButton, { borderColor: theme.border }]}><Text style={[styles.outlineText, { color: theme.text }]}>Cancel</Text></TouchableOpacity></Card> : <TouchableOpacity accessibilityRole="button" disabled={!transcript.trim() || busy} onPress={continueToReview} style={[styles.primaryButton, { backgroundColor: theme.primary, opacity: transcript.trim() && !busy ? 1 : 0.55 }]}><MaterialIcons name="auto-awesome" size={20} color="#FFFFFF" /><Text style={styles.primaryButtonText}>Continue to review</Text></TouchableOpacity>}

        {safeVoiceMessage ? <Card style={[styles.errorCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}><MaterialIcons name="info-outline" size={22} color={theme.warning} /><Text style={[styles.errorCopy, { color: theme.textMuted }]}>{safeVoiceMessage}</Text></Card> : null}
        {bookingError ? <Card style={[styles.errorCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}><MaterialIcons name="info-outline" size={22} color={theme.warning} /><Text style={[styles.errorTitle, { color: theme.text }]}>{bookingError.title}</Text><Text style={[styles.errorCopy, { color: theme.textMuted }]}>{bookingError.message}</Text>{isDevelopmentBuild && bookingError.diagnostic ? <Text style={[styles.diagnostic, { color: theme.textMuted }]}>Code: {bookingError.diagnostic.code}{typeof bookingError.diagnostic.status === "number" ? ` • HTTP ${bookingError.diagnostic.status}` : ""}{bookingError.diagnostic.requestId ? ` • Request: ${bookingError.diagnostic.requestId}` : ""}</Text> : null}</Card> : null}

        {!processing ? <TouchableOpacity accessibilityRole="button" style={styles.manualLink} onPress={() => router.push("/select-service")}><Text style={[styles.manualLinkText, { color: theme.primary }]}>Continue with Manual Booking</Text></TouchableOpacity> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: 20 }, back: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", minHeight: 40 }, backText: { marginLeft: 6, fontSize: 15, fontWeight: "600" },
  title: { marginTop: 18, fontSize: 30, fontWeight: "700" }, subtitle: { marginTop: 8, fontSize: 15, lineHeight: 22 }, notice: { marginTop: 22, alignItems: "center" }, noticeCopy: { marginTop: 8, fontSize: 14, lineHeight: 20, textAlign: "center" },
  voiceCard: { marginTop: 18, alignItems: "center", paddingVertical: 26 }, microphoneButton: { width: 74, height: 74, borderRadius: 37, alignItems: "center", justifyContent: "center" }, voiceTitle: { marginTop: 14, fontSize: 18, fontWeight: "700" }, voiceCopy: { marginTop: 7, paddingHorizontal: 12, fontSize: 14, lineHeight: 20, textAlign: "center" }, listenActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  transcriptLabel: { marginTop: 24, fontSize: 16, fontWeight: "700" }, transcriptInput: { minHeight: 132, marginTop: 10, padding: 16, borderWidth: 1, borderRadius: 16, fontSize: 16, lineHeight: 22 }, counter: { marginTop: 7, fontSize: 12, textAlign: "right" }, retryButton: { minHeight: 48, marginTop: 14, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, retryText: { fontSize: 15, fontWeight: "600" },
  primaryButton: { minHeight: 54, marginTop: 22, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }, primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" }, outlineButton: { minHeight: 44, minWidth: 110, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" }, outlineText: { fontSize: 15, fontWeight: "600" },
  processingCard: { marginTop: 22, alignItems: "center", paddingVertical: 30 }, processingTitle: { marginTop: 16, fontSize: 18, fontWeight: "700" }, processingCopy: { marginTop: 8, marginBottom: 18, fontSize: 14, lineHeight: 20, textAlign: "center" }, errorCard: { marginTop: 18, alignItems: "center" }, errorTitle: { marginTop: 9, fontSize: 16, fontWeight: "700", textAlign: "center" }, errorCopy: { marginTop: 7, fontSize: 14, lineHeight: 20, textAlign: "center" }, diagnostic: { marginTop: 8, fontSize: 12, lineHeight: 18, textAlign: "center" }, manualLink: { alignSelf: "center", minHeight: 48, justifyContent: "center", marginTop: 22 }, manualLinkText: { fontSize: 15, fontWeight: "700" },
});
