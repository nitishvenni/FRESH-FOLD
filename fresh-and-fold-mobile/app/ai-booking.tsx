import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "../components/Card";
import { useAppTheme } from "../hooks/useAppTheme";
import { AiServiceError, parseNaturalLanguageBooking } from "../services/aiService";
import { AiDevelopmentDiagnostic, toAiDevelopmentDiagnostic } from "../services/aiErrors";

type BookingError = {
  title: string;
  message: string;
  retryable: boolean;
  diagnostic?: AiDevelopmentDiagnostic;
};

const isDevelopmentBuild = typeof __DEV__ !== "undefined" && __DEV__;

const errorFrom = (error: unknown): BookingError => {
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

export default function AiBookingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [requestText, setRequestText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<BookingError | null>(null);

  const submit = async () => {
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
      if (!(requestError instanceof Error && requestError.name === "AbortError")) {
        setError(errorFrom(requestError));
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setProcessing(false);
      }
    }
  };

  const cancel = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setProcessing(false);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 18 }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <TouchableOpacity accessibilityRole="button" style={styles.back} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>AI Care</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Describe your booking</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Tell us the garments and service you want. You will review every suggestion before booking.</Text>

        <Card style={[styles.notice, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <MaterialIcons name="info-outline" size={22} color={theme.warning} />
          <Text style={[styles.noticeTitle, { color: theme.text }]}>Keep details simple</Text>
          <Text style={[styles.noticeCopy, { color: theme.textMuted }]}>Do not include addresses, payment details, passwords, or other sensitive information.</Text>
        </Card>

        <TextInput
          accessibilityLabel="Natural-language booking request"
          editable={!processing}
          multiline
          maxLength={1000}
          value={requestText}
          onChangeText={(value) => {
            setRequestText(value);
            setError(null);
          }}
          placeholder="Example: Wash two shirts and one pair of jeans"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text, backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
          textAlignVertical="top"
        />
        <Text style={[styles.counter, { color: theme.textMuted }]}>{requestText.length}/1000</Text>

        {processing ? (
          <Card style={[styles.processingCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.processingTitle, { color: theme.text }]}>Preparing your review</Text>
            <Text style={[styles.processingCopy, { color: theme.textMuted }]}>This is a suggestion only. It does not create a booking.</Text>
            <TouchableOpacity accessibilityRole="button" onPress={cancel} style={[styles.secondaryButton, { borderColor: theme.border }]}>
              <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <TouchableOpacity accessibilityRole="button" onPress={() => void submit()} style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
            <MaterialIcons name="auto-awesome" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Create review</Text>
          </TouchableOpacity>
        )}

        {error ? (
          <Card style={[styles.errorCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <MaterialIcons name="info-outline" size={22} color={theme.warning} />
            <Text style={[styles.errorTitle, { color: theme.text }]}>{error.title}</Text>
            <Text style={[styles.errorCopy, { color: theme.textMuted }]}>{error.message}</Text>
            {isDevelopmentBuild && error.diagnostic ? <Text style={[styles.diagnostic, { color: theme.textMuted }]}>Code: {error.diagnostic.code}{typeof error.diagnostic.status === "number" ? ` • HTTP ${error.diagnostic.status}` : ""}{error.diagnostic.requestId ? ` • Request: ${error.diagnostic.requestId}` : ""}</Text> : null}
          </Card>
        ) : null}

        {!processing ? <TouchableOpacity accessibilityRole="button" style={styles.manualLink} onPress={() => router.push("/select-service")}><Text style={[styles.manualLinkText, { color: theme.primary }]}>Continue with Manual Booking</Text></TouchableOpacity> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: 20 }, back: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", minHeight: 40 }, backText: { marginLeft: 6, fontSize: 15, fontWeight: "600" },
  title: { marginTop: 18, fontSize: 30, fontWeight: "700" }, subtitle: { marginTop: 8, fontSize: 15, lineHeight: 22 }, notice: { marginTop: 22, alignItems: "center" }, noticeTitle: { marginTop: 8, fontSize: 16, fontWeight: "700" }, noticeCopy: { marginTop: 6, fontSize: 14, lineHeight: 20, textAlign: "center" },
  input: { minHeight: 150, marginTop: 22, padding: 16, borderWidth: 1, borderRadius: 16, fontSize: 16, lineHeight: 22 }, counter: { marginTop: 7, fontSize: 12, textAlign: "right" }, primaryButton: { minHeight: 54, marginTop: 22, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }, primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondaryButton: { minHeight: 52, marginTop: 18, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }, secondaryButtonText: { fontSize: 15, fontWeight: "600" }, processingCard: { marginTop: 22, alignItems: "center", paddingVertical: 30 }, processingTitle: { marginTop: 16, fontSize: 18, fontWeight: "700" }, processingCopy: { marginTop: 8, fontSize: 14, lineHeight: 20, textAlign: "center" },
  errorCard: { marginTop: 22, alignItems: "center" }, errorTitle: { marginTop: 9, fontSize: 16, fontWeight: "700", textAlign: "center" }, errorCopy: { marginTop: 6, fontSize: 14, lineHeight: 20, textAlign: "center" }, diagnostic: { marginTop: 8, fontSize: 12, lineHeight: 18, textAlign: "center" }, manualLink: { alignSelf: "center", minHeight: 48, justifyContent: "center", marginTop: 22 }, manualLinkText: { fontSize: 15, fontWeight: "700" },
});
