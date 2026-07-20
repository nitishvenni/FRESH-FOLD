import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const { theme, isDark } = useAppTheme();
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

  // Pulse animation for the listening state
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (voiceState === "listening") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
    }
  }, [voiceState]);

  const updateVoiceState = (state: VoiceBookingState) => {
    voiceStateRef.current = state;
    setVoiceState(state);
  };

  const setTranscriptValue = (value: string) => {
    transcriptRef.current = value;
    setTranscript(value);
  };

  const cancelListening = (reason: VoiceCleanupReason = "user_cancel") => {
    sessionRef.current = nextVoiceRecognitionSession(sessionRef.current);
    cancelledRef.current = true;
    if (recognitionStartedRef.current) {
      cancelledRef.current = true;
      try {
        voiceRecognition.cancel();
      } catch {}
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
      if (!isCurrentVoiceRecognitionSession(sessionRef.current, session, mountedRef.current)) return;
      
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

  const glassBg = isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.7)";
  const glassBorder = isDark ? "rgba(148, 163, 184, 0.15)" : "rgba(148, 163, 184, 0.2)";
  const heroBg = isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(241, 245, 249, 0.6)";

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15]
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0]
  });

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" style={styles.backButton} onPress={() => router.back()} disabled={busy}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Voice Booking</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Speak your laundry request and we'll handle the rest.
        </Text>

        <View style={[styles.privacyCard, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.05)", borderColor: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.15)" }]}>
          <MaterialIcons name="security" size={20} color={isDark ? "#60A5FA" : "#3B82F6"} style={{ marginTop: 2 }} />
          <Text style={[styles.privacyCopy, { color: isDark ? "#93C5FD" : "#2563EB" }]}>
            Do not speak addresses, payment details, passwords, or other sensitive information.
          </Text>
        </View>

        <View style={[styles.heroCard, { backgroundColor: heroBg, borderColor: glassBorder }]}>
          <View style={styles.microphoneContainer}>
            {listening ? (
              <Animated.View style={[styles.pulseRing, { backgroundColor: theme.primary, transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
            ) : null}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={listening ? "Stop listening" : "Start voice booking"}
              accessibilityState={{ disabled: busy && !listening, busy: listening }}
              disabled={busy && !listening}
              onPress={listening ? stopListening : () => void startListening()}
              style={[styles.microphoneButton, { backgroundColor: listening ? theme.warning : theme.primary, opacity: busy && !listening ? 0.6 : 1 }]}
            >
              {voiceState === "requesting_permission" || voiceState === "stopping" ? (
                <ActivityIndicator color="#FFFFFF" size="large" />
              ) : (
                <MaterialIcons name={listening ? "stop" : "mic"} size={36} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.voiceTitle, { color: theme.text }]}>
            {voiceState === "requesting_permission" ? "Requesting permission..."
              : voiceState === "stopping" ? "Finishing your transcript..."
              : listening ? "Listening..."
              : "Tap to speak"}
          </Text>
          <Text style={[styles.voiceCopy, { color: theme.textMuted }]}>
            Your words become editable text before any booking request is sent.
          </Text>

          <View style={styles.featuresRow}>
            <View style={styles.featureItem}>
              <MaterialIcons name="mic-none" size={20} color={isDark ? "#93C5FD" : "#3B82F6"} />
              <Text style={[styles.featureText, { color: theme.textMuted }]}>Speak{"\n"}Naturally</Text>
            </View>
            <View style={[styles.featureDivider, { backgroundColor: glassBorder }]} />
            <View style={styles.featureItem}>
              <MaterialIcons name="fact-check" size={20} color={isDark ? "#93C5FD" : "#3B82F6"} />
              <Text style={[styles.featureText, { color: theme.textMuted }]}>Review Your{"\n"}Transcript</Text>
            </View>
            <View style={[styles.featureDivider, { backgroundColor: glassBorder }]} />
            <View style={styles.featureItem}>
              <MaterialIcons name="edit" size={20} color={isDark ? "#93C5FD" : "#3B82F6"} />
              <Text style={[styles.featureText, { color: theme.textMuted }]}>Edit Before{"\n"}Continuing</Text>
            </View>
          </View>
        </View>

        {listening ? (
          <View style={[styles.listeningStatusCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <MaterialIcons name="graphic-eq" size={20} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.listeningStatusTitle, { color: theme.text }]}>Listening...</Text>
              <Text style={[styles.listeningStatusCopy, { color: theme.textMuted }]}>Speak clearly in a normal tone. Tap again to stop.</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.transcriptSection}>
          <View style={styles.transcriptHeader}>
            <Text style={[styles.transcriptLabel, { color: theme.text }]}>I heard</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <MaterialIcons name="edit" size={14} color={theme.primary} />
              <Text style={[styles.editText, { color: theme.primary }]}>Edit</Text>
            </View>
          </View>
          
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
            style={[styles.transcriptInput, { color: theme.text, backgroundColor: glassBg, borderColor: glassBorder, opacity: busy ? 0.6 : 1 }]}
          />
          <Text style={[styles.counter, { color: theme.textMuted }]}>
            {transcript.length}/{MAX_VOICE_BOOKING_TRANSCRIPT_LENGTH}
          </Text>
        </View>

        {!listening && !processing ? (
          <TouchableOpacity accessibilityRole="button" onPress={() => void startListening()} style={[styles.retryButton, { borderColor: glassBorder, backgroundColor: glassBg }]}>
            <MaterialIcons name="refresh" size={18} color={theme.text} />
            <Text style={[styles.retryText, { color: theme.text }]}>Retry Voice Input</Text>
          </TouchableOpacity>
        ) : null}

        {safeVoiceMessage ? (
          <View style={[styles.errorCard, { backgroundColor: isDark ? "rgba(245, 158, 11, 0.1)" : "rgba(245, 158, 11, 0.05)", borderColor: isDark ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.2)" }]}>
            <MaterialIcons name="info-outline" size={20} color={isDark ? "#FBBF24" : "#D97706"} style={{ marginTop: 2 }} />
            <Text style={[styles.errorCopy, { color: isDark ? "#FBBF24" : "#D97706" }]}>{safeVoiceMessage}</Text>
          </View>
        ) : null}

        {bookingError ? (
          <View style={[styles.errorCard, { backgroundColor: isDark ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.05)", borderColor: isDark ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.2)" }]}>
            <MaterialIcons name="error-outline" size={20} color={isDark ? "#F87171" : "#DC2626"} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.errorTitle, { color: isDark ? "#F87171" : "#DC2626" }]}>{bookingError.title}</Text>
              <Text style={[styles.errorCopy, { color: isDark ? "#FCA5A5" : "#B91C1C", marginTop: 4 }]}>{bookingError.message}</Text>
              {isDevelopmentBuild && bookingError.diagnostic ? (
                <Text style={[styles.diagnostic, { color: isDark ? "#FCA5A5" : "#B91C1C", opacity: 0.8 }]}>
                  Code: {bookingError.diagnostic.code}
                  {typeof bookingError.diagnostic.status === "number" ? ` • HTTP ${bookingError.diagnostic.status}` : ""}
                  {bookingError.diagnostic.requestId ? ` • Request: ${bookingError.diagnostic.requestId}` : ""}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {processing ? (
          <View style={[styles.processingCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.processingTitle, { color: theme.text }]}>Understanding your booking request...</Text>
            <Text style={[styles.processingCopy, { color: theme.textMuted }]}>Preparing your review details.</Text>
            <TouchableOpacity accessibilityRole="button" onPress={cancelBookingRequest} style={[styles.cancelButton, { borderColor: glassBorder }]}>
              <Text style={[styles.cancelText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            accessibilityRole="button"
            disabled={!transcript.trim() || busy}
            onPress={continueToReview}
            style={[styles.primaryButton, { backgroundColor: theme.primary, opacity: transcript.trim() && !busy ? 1 : 0.55 }]}
          >
            <MaterialIcons name="auto-awesome" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Continue to review</Text>
          </TouchableOpacity>
        )}

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: glassBorder }]} />
          <Text style={[styles.dividerText, { color: theme.textMuted }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: glassBorder }]} />
        </View>

        {!processing ? (
          <TouchableOpacity accessibilityRole="button" style={styles.manualLink} onPress={() => router.push("/select-service")}>
            <Text style={[styles.manualLinkText, { color: theme.primary }]}>Continue with Manual Booking</Text>
          </TouchableOpacity>
        ) : null}

        <View style={[styles.safetyNoteCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <MaterialIcons name="verified-user" size={18} color={theme.textMuted} />
          <Text style={[styles.safetyNoteText, { color: theme.textMuted }]}>
            Nothing is sent until you review and confirm your request.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, height: 56 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  subtitle: { fontSize: 15, textAlign: "center", marginBottom: 20, paddingHorizontal: 16, lineHeight: 22 },
  
  privacyCard: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  privacyCopy: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "500" },

  heroCard: { padding: 24, borderRadius: 24, borderWidth: 1, alignItems: "center", marginBottom: 24 },
  microphoneContainer: { width: 100, height: 100, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  microphoneButton: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", zIndex: 2, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  pulseRing: { position: "absolute", width: 80, height: 80, borderRadius: 40, zIndex: 1 },
  
  voiceTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  voiceCopy: { fontSize: 14, lineHeight: 20, textAlign: "center", marginBottom: 24, paddingHorizontal: 16 },

  featuresRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, width: "100%" },
  featureItem: { flex: 1, alignItems: "center", gap: 6 },
  featureText: { fontSize: 11, textAlign: "center", lineHeight: 15, fontWeight: "600" },
  featureDivider: { width: 1, height: 32 },

  listeningStatusCard: { flexDirection: "row", gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 20, alignItems: "center" },
  listeningStatusTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  listeningStatusCopy: { fontSize: 13, lineHeight: 18 },

  transcriptSection: { marginBottom: 16 },
  transcriptHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingHorizontal: 4 },
  transcriptLabel: { fontSize: 16, fontWeight: "700" },
  editText: { fontSize: 14, fontWeight: "600" },
  transcriptInput: { minHeight: 140, padding: 16, borderWidth: 1, borderRadius: 16, fontSize: 16, lineHeight: 24 },
  counter: { marginTop: 8, fontSize: 12, textAlign: "right", paddingHorizontal: 4 },

  retryButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 24 },
  retryText: { fontSize: 15, fontWeight: "600" },

  errorCard: { flexDirection: "row", gap: 10, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 20, alignItems: "flex-start" },
  errorTitle: { fontSize: 15, fontWeight: "700" },
  errorCopy: { fontSize: 14, lineHeight: 20 },
  diagnostic: { fontSize: 11, marginTop: 6 },

  processingCard: { padding: 24, borderRadius: 20, borderWidth: 1, alignItems: "center", marginBottom: 20 },
  processingTitle: { marginTop: 16, fontSize: 16, fontWeight: "700", textAlign: "center" },
  processingCopy: { marginTop: 6, fontSize: 14, textAlign: "center", marginBottom: 20 },
  cancelButton: { minHeight: 44, paddingHorizontal: 24, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 14, fontWeight: "600" },

  primaryButton: { minHeight: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 24 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },

  manualLink: { alignSelf: "center", minHeight: 44, justifyContent: "center", marginBottom: 24 },
  manualLinkText: { fontSize: 15, fontWeight: "700" },

  safetyNoteCard: { flexDirection: "row", gap: 10, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: "center" },
  safetyNoteText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
