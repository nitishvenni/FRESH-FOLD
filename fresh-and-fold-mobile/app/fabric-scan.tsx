import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
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
  const { theme, isDark } = useAppTheme();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [processing, setProcessing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [error, setError] = useState<ScanError | null>(null);

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
          params: { result: JSON.stringify(result), imageUri: selected.image.uri },
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

  const glassBg = isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.7)";
  const glassBorder = isDark ? "rgba(148, 163, 184, 0.15)" : "rgba(148, 163, 184, 0.2)";
  const iconBg = isDark ? "rgba(37, 99, 235, 0.15)" : "rgba(37, 99, 235, 0.08)";
  const bulletIconColor = isDark ? "#60A5FA" : "#3B82F6";

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Fabric Identification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          AI identifies your fabric and suggests the best care instructions.
        </Text>

        <View style={[styles.heroCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <View style={styles.heroIllustrationContainer}>
            <View style={[styles.heroIconCircle, { backgroundColor: iconBg }]}>
              <MaterialCommunityIcons name="magnify-scan" size={48} color={theme.primary} />
            </View>
          </View>
          <View style={styles.heroContent}>
            <Text style={[styles.heroTitle, { color: theme.text }]}>Smart Fabric Analysis</Text>
            
            <View style={styles.heroBulletList}>
              <View style={styles.heroBullet}>
                <MaterialCommunityIcons name="layers-search" size={16} color={bulletIconColor} />
                <Text style={[styles.heroBulletText, { color: theme.textMuted }]}>Identifies possible fabric type</Text>
              </View>
              <View style={styles.heroBullet}>
                <MaterialCommunityIcons name="magic-staff" size={16} color={bulletIconColor} />
                <Text style={[styles.heroBulletText, { color: theme.textMuted }]}>Analyzes visible fabric characteristics</Text>
              </View>
              <View style={styles.heroBullet}>
                <MaterialCommunityIcons name="shield-check" size={16} color={bulletIconColor} />
                <Text style={[styles.heroBulletText, { color: theme.textMuted }]}>Provides recommended care guidance</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>How it works</Text>
          <View style={styles.stepsContainer}>
            <View style={styles.stepItem}>
              <View style={[styles.stepIconContainer, { backgroundColor: iconBg }]}>
                <MaterialIcons name="photo-camera" size={24} color={theme.primary} />
                <View style={[styles.stepBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.stepBadgeText}>1</Text>
                </View>
              </View>
              <Text style={[styles.stepTitle, { color: theme.text }]}>Capture Fabric</Text>
              <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>Take a clear photo of the fabric</Text>
            </View>
            
            <View style={styles.stepDivider}>
              <View style={[styles.stepLine, { borderColor: glassBorder }]} />
            </View>

            <View style={styles.stepItem}>
              <View style={[styles.stepIconContainer, { backgroundColor: iconBg }]}>
                <MaterialCommunityIcons name="brain" size={24} color={theme.primary} />
                <View style={[styles.stepBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.stepBadgeText}>2</Text>
                </View>
              </View>
              <Text style={[styles.stepTitle, { color: theme.text }]}>AI Analyzes</Text>
              <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>Analyzes visible fabric properties</Text>
            </View>

            <View style={styles.stepDivider}>
              <View style={[styles.stepLine, { borderColor: glassBorder }]} />
            </View>

            <View style={styles.stepItem}>
              <View style={[styles.stepIconContainer, { backgroundColor: iconBg }]}>
                <MaterialCommunityIcons name="hanger" size={24} color={theme.primary} />
                <View style={[styles.stepBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.stepBadgeText}>3</Text>
                </View>
              </View>
              <Text style={[styles.stepTitle, { color: theme.text }]}>Get Care Guide</Text>
              <Text style={[styles.stepSubtitle, { color: theme.textMuted }]}>Receive recommended care instructions</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Tips for best results</Text>
          <View style={styles.tipsGrid}>
            <View style={[styles.tipItem, { backgroundColor: glassBg, borderColor: glassBorder }]}>
              <MaterialIcons name="wb-sunny" size={24} color={bulletIconColor} style={styles.tipIcon} />
              <Text style={[styles.tipText, { color: theme.textMuted }]}>Good lighting</Text>
            </View>
            <View style={[styles.tipItem, { backgroundColor: glassBg, borderColor: glassBorder }]}>
              <MaterialIcons name="center-focus-strong" size={24} color={bulletIconColor} style={styles.tipIcon} />
              <Text style={[styles.tipText, { color: theme.textMuted }]}>Keep in focus</Text>
            </View>
            <View style={[styles.tipItem, { backgroundColor: glassBg, borderColor: glassBorder }]}>
              <MaterialIcons name="grid-on" size={24} color={bulletIconColor} style={styles.tipIcon} />
              <Text style={[styles.tipText, { color: theme.textMuted }]}>Show texture clearly</Text>
            </View>
            <View style={[styles.tipItem, { backgroundColor: glassBg, borderColor: glassBorder }]}>
              <MaterialIcons name="image" size={24} color={bulletIconColor} style={styles.tipIcon} />
              <Text style={[styles.tipText, { color: theme.textMuted }]}>Plain background</Text>
            </View>
          </View>
        </View>

        {previewUri ? (
          <View style={[styles.previewContainer, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Image accessibilityLabel="Selected fabric preview" source={{ uri: previewUri }} style={[styles.previewImage, { borderColor: glassBorder }]} />
          </View>
        ) : null}

        {error ? (
          <View style={[styles.errorCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <MaterialIcons name="info-outline" size={24} color={theme.warning} />
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
              <TouchableOpacity accessibilityRole="button" style={[styles.retryButton, { borderColor: glassBorder }]} onPress={() => setError(null)}>
                <Text style={[styles.retryButtonText, { color: theme.text }]}>Dismiss</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {processing ? (
          <View style={[styles.processingContainer, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <ActivityIndicator size="large" color={theme.primary} style={{ marginBottom: 16 }} />
            <Text style={[styles.processingTitle, { color: theme.text }]}>Analyzing fabric...</Text>
            <Text style={[styles.processingCopy, { color: theme.textMuted }]}>Examining fabric characteristics.</Text>
            <TouchableOpacity accessibilityRole="button" onPress={cancelProcessing} style={[styles.cancelButton, { borderColor: glassBorder }]}>
              <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionsContainer}>
            <TouchableOpacity accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={() => void startScan("camera")}>
              <View style={styles.buttonIconBg}>
                <MaterialIcons name="photo-camera" size={24} color={theme.primary} />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.primaryButtonTitle}>Take Photo</Text>
                <Text style={styles.primaryButtonSubtitle}>Use camera to capture your fabric</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity accessibilityRole="button" style={[styles.secondaryButton, { backgroundColor: glassBg, borderColor: glassBorder }]} onPress={() => void startScan("gallery")}>
              <View style={styles.buttonIconBgSecondary}>
                <MaterialIcons name="photo-library" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={[styles.secondaryButtonTitle, { color: theme.text }]}>Choose from Gallery</Text>
                <Text style={[styles.secondaryButtonSubtitle, { color: theme.textMuted }]}>Upload an existing photo of your fabric</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, height: 56 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  subtitle: { fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 24, paddingHorizontal: 16 },
  
  heroCard: { borderRadius: 24, padding: 24, borderWidth: 1, flexDirection: "column", alignItems: "center", marginBottom: 32 },
  heroIllustrationContainer: { marginBottom: 20, alignItems: "center", justifyContent: "center" },
  heroIconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  heroContent: { width: "100%", alignItems: "center" },
  heroTitle: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  heroBulletList: { width: "100%", gap: 12 },
  heroBullet: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroBulletText: { fontSize: 14, fontWeight: "500" },

  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 20 },
  
  stepsContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  stepItem: { flex: 1, alignItems: "center" },
  stepIconContainer: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 12, position: "relative" },
  stepBadge: { position: "absolute", bottom: -4, right: -4, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#000" },
  stepBadgeText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  stepTitle: { fontSize: 13, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  stepSubtitle: { fontSize: 11, textAlign: "center", lineHeight: 16 },
  stepDivider: { width: 30, height: 56, justifyContent: "center", alignItems: "center", paddingHorizontal: 4 },
  stepLine: { width: "100%", borderWidth: 1, borderStyle: "dashed" },

  tipsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  tipItem: { width: "48%", borderWidth: 1, borderRadius: 16, padding: 16, alignItems: "center", justifyContent: "center" },
  tipIcon: { marginBottom: 8 },
  tipText: { fontSize: 13, fontWeight: "500", textAlign: "center" },

  previewContainer: { marginTop: 8, marginBottom: 24, padding: 8, borderRadius: 24, borderWidth: 1 },
  previewImage: { width: "100%", height: 200, borderRadius: 16, borderWidth: 1, resizeMode: "cover" },

  actionsContainer: { gap: 16, marginTop: 16, marginBottom: 24 },
  primaryButton: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 20, minHeight: 80 },
  buttonIconBg: { width: 56, height: 56, borderRadius: 16, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  buttonTextContainer: { flex: 1, marginLeft: 16 },
  primaryButtonTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "700", marginBottom: 4 },
  primaryButtonSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  
  secondaryButton: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 20, borderWidth: 1, minHeight: 80 },
  buttonIconBgSecondary: { width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(148, 163, 184, 0.2)", alignItems: "center", justifyContent: "center" },
  secondaryButtonTitle: { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  secondaryButtonSubtitle: { fontSize: 13 },

  processingContainer: { marginTop: 8, borderRadius: 24, borderWidth: 1, padding: 32, alignItems: "center" },
  processingTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  processingCopy: { fontSize: 14, textAlign: "center", marginBottom: 24 },
  cancelButton: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 16, borderWidth: 1 },
  cancelButtonText: { fontSize: 15, fontWeight: "600" },

  errorCard: { marginTop: 8, marginBottom: 24, borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center" },
  errorTitle: { marginTop: 12, fontSize: 16, fontWeight: "700", textAlign: "center" },
  errorCopy: { marginTop: 8, fontSize: 14, lineHeight: 20, textAlign: "center" },
  diagnosticCopy: { marginTop: 12, fontSize: 12, lineHeight: 18, textAlign: "center" },
  retryButton: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  retryButtonText: { fontSize: 14, fontWeight: "600" },
});
