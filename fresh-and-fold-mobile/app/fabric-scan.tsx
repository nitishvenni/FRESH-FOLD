import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "../components/Card";
import { useAppTheme } from "../hooks/useAppTheme";
import { AiServiceError, analyzeFabric } from "../services/aiService";
import { AiDevelopmentDiagnostic, toAiDevelopmentDiagnostic } from "../services/aiErrors";
import { selectAiImage } from "../utils/aiImage";

type ScanError = {
  title: string;
  message: string;
  retryable: boolean;
  diagnostic?: AiDevelopmentDiagnostic;
};

const isDevelopmentBuild = typeof __DEV__ !== "undefined" && __DEV__;

const errorFrom = (error: unknown): ScanError => {
  if (error instanceof AiServiceError) {
    if (error.code === "AI_NOT_CONFIGURED") {
      return {
        title: "Fabric Identification unavailable",
        message: "Fabric identification is not configured right now. You can continue with Manual Booking.",
        retryable: false,
      };
    }

    return {
      title: "Fabric analysis could not finish",
      message: error.message,
      retryable: error.retryable,
      ...(isDevelopmentBuild ? { diagnostic: toAiDevelopmentDiagnostic(error) } : {}),
    };
  }

  return {
    title: "Fabric analysis could not finish",
    message: "Please try again or continue with Manual Booking.",
    retryable: true,
  };
};

export default function FabricScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [processing, setProcessing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [error, setError] = useState<ScanError | null>(null);

  const openManualBooking = () => router.push("/select-service");

  const startScan = async (source: "camera" | "gallery") => {
    if (processing) return;

    setError(null);
    let selected;
    try {
      selected = await selectAiImage(source);
    } catch (selectionError) {
      setError(errorFrom(selectionError));
      return;
    }

    if (selected.kind === "cancelled") return;

    if (selected.kind === "permission_denied") {
      setError({
        title: `${selected.source === "camera" ? "Camera" : "Photo library"} permission needed`,
        message: "Allow access to choose a fabric image, or continue with Manual Booking.",
        retryable: true,
      });
      return;
    }

    setPreviewUri(selected.image.uri);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setProcessing(true);

    try {
      const result = await analyzeFabric(selected.image, controller.signal);
      if (!controller.signal.aborted) {
        router.replace({
          pathname: "/fabric-analysis" as never,
          params: { result: JSON.stringify(result) },
        });
      }
    } catch (scanError) {
      if (!(scanError instanceof Error && scanError.name === "AbortError")) {
        setError(errorFrom(scanError));
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setProcessing(false);
      }
    }
  };

  const cancelProcessing = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setProcessing(false);
    setPreviewUri(null);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 18 }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <TouchableOpacity accessibilityRole="button" style={styles.back} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>AI Care</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>Fabric Identification</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Take or choose one clear photo of a garment or fabric. You will review advisory guidance.</Text>

        {previewUri ? (
          <Image accessibilityLabel="Selected fabric preview" source={{ uri: previewUri }} style={[styles.preview, { borderColor: theme.border }]} />
        ) : null}

        {processing ? (
          <Card style={[styles.processingCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.processingTitle, { color: theme.text }]}>Analyzing fabric</Text>
            <Text style={[styles.processingCopy, { color: theme.textMuted }]}>Preparing advisory care guidance. This does not create a booking.</Text>
            <TouchableOpacity accessibilityRole="button" onPress={cancelProcessing} style={[styles.secondaryButton, { borderColor: theme.border }]}>
              <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={() => void startScan("camera")}>
              <MaterialIcons name="photo-camera" size={21} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Take a photo</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={[styles.secondaryButton, { borderColor: theme.border }]} onPress={() => void startScan("gallery")}>
              <MaterialIcons name="photo-library" size={21} color={theme.primary} />
              <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Choose from gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {error ? (
          <Card style={[styles.errorCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <MaterialIcons name="info-outline" size={22} color={theme.warning} />
            <Text style={[styles.errorTitle, { color: theme.text }]}>{error.title}</Text>
            <Text style={[styles.errorCopy, { color: theme.textMuted }]}>{error.message}</Text>
            {isDevelopmentBuild && error.diagnostic ? (
              <Text style={[styles.diagnosticCopy, { color: theme.textMuted }]}>
                Code: {error.diagnostic.code}
                {typeof error.diagnostic.status === "number" ? ` • HTTP ${error.diagnostic.status}` : ""}
                {error.diagnostic.requestId ? ` • Request: ${error.diagnostic.requestId}` : ""}
              </Text>
            ) : null}
            {error.retryable ? (
              <TouchableOpacity accessibilityRole="button" style={[styles.secondaryButton, { borderColor: theme.border }]} onPress={() => setError(null)}>
                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Try another photo</Text>
              </TouchableOpacity>
            ) : null}
          </Card>
        ) : null}

        {!processing ? (
          <TouchableOpacity accessibilityRole="button" style={styles.manualLink} onPress={openManualBooking}>
            <Text style={[styles.manualLinkText, { color: theme.primary }]}>Continue with Manual Booking</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  back: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", minHeight: 40 },
  backText: { marginLeft: 6, fontSize: 15, fontWeight: "600" },
  title: { marginTop: 18, fontSize: 30, fontWeight: "700" },
  subtitle: { marginTop: 8, fontSize: 15, lineHeight: 22 },
  preview: { width: "100%", height: 240, marginTop: 24, borderWidth: 1, borderRadius: 20, resizeMode: "cover" },
  actions: { marginTop: 28, gap: 12 },
  primaryButton: { minHeight: 54, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  primaryButtonText: { marginLeft: 9, color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondaryButton: { minHeight: 52, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondaryButtonText: { marginLeft: 8, fontSize: 15, fontWeight: "600" },
  processingCard: { marginTop: 28, alignItems: "center", paddingVertical: 30 },
  processingTitle: { marginTop: 16, fontSize: 18, fontWeight: "700" },
  processingCopy: { marginTop: 8, fontSize: 14, lineHeight: 20, textAlign: "center" },
  errorCard: { marginTop: 22, alignItems: "center" },
  errorTitle: { marginTop: 9, fontSize: 16, fontWeight: "700", textAlign: "center" },
  errorCopy: { marginTop: 6, fontSize: 14, lineHeight: 20, textAlign: "center" },
  diagnosticCopy: { marginTop: 8, fontSize: 12, lineHeight: 18, textAlign: "center" },
  manualLink: { alignSelf: "center", minHeight: 48, justifyContent: "center", marginTop: 22 },
  manualLinkText: { fontSize: 15, fontWeight: "700" },
});
