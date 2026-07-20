import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AICareLogo from "../components/AICareLogo";
import { AiServiceError, analyzeGarments } from "../services/aiService";
import { AiDevelopmentDiagnostic, toAiDevelopmentDiagnostic } from "../services/aiErrors";
import { homeDesign } from "../theme/theme";
import { useAppTheme } from "../hooks/useAppTheme";
import { selectGarmentImage } from "../utils/aiImage";

type ScanError = {
  title: string;
  message: string;
  retryable: boolean;
  diagnostic?: AiDevelopmentDiagnostic;
};

type CaptureSource = "camera" | "gallery";

const isDevelopmentBuild = typeof __DEV__ !== "undefined" && __DEV__;
const shirtPlaceholder = require("../assets/images/brand/smart-scan-shirt-placeholder.png");

const scanTips = [
  { icon: "checkroom" as const, label: "Show full\ngarment", tone: "primary" as const },
  { icon: "light-mode" as const, label: "Use good\nlighting", tone: "warning" as const },
  { icon: "center-focus-strong" as const, label: "Keep in\nfocus", tone: "neutral" as const },
  { icon: "auto-awesome" as const, label: "Avoid busy\nbackground", tone: "accent" as const },
];

const errorFrom = (error: unknown): ScanError => {
  if (error instanceof AiServiceError) {
    if (error.code === "AI_NOT_CONFIGURED") {
      return {
        title: "Smart Scan unavailable",
        message: "Garment recognition is not configured right now. You can continue with Manual Booking.",
        retryable: false,
      };
    }

    return {
      title: "Scan could not finish",
      message: error.message,
      retryable: error.retryable,
      ...(isDevelopmentBuild ? { diagnostic: toAiDevelopmentDiagnostic(error) } : {}),
    };
  }

  return {
    title: "Scan could not finish",
    message: "Please try again or continue with Manual Booking.",
    retryable: true,
  };
};

export default function SmartScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { theme, isDark } = useAppTheme();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [processing, setProcessing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [error, setError] = useState<ScanError | null>(null);
  const compact = width < 360;
  const captureHeight = compact ? 254 : width >= 430 ? 316 : 288;

  const openManualBooking = useCallback(() => router.push("/select-service"), [router]);

  const startScan = useCallback(async (source: CaptureSource) => {
    if (processing) return;

    setError(null);
    let selected;
    try {
      selected = await selectGarmentImage(source);
    } catch (selectionError) {
      setError(errorFrom(selectionError));
      return;
    }

    if (selected.kind === "cancelled") return;

    if (selected.kind === "permission_denied") {
      setError({
        title: `${selected.source === "camera" ? "Camera" : "Photo library"} permission needed`,
        message: "Allow access to choose a garment image, or continue with Manual Booking.",
        retryable: true,
      });
      return;
    }

    setPreviewUri(selected.image.uri);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setProcessing(true);

    try {
      const result = await analyzeGarments(selected.image, controller.signal);
      if (!controller.signal.aborted) {
        router.replace({
          pathname: "/ai-analysis" as never,
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
  }, [processing, router]);

  const cancelProcessing = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setProcessing(false);
    setPreviewUri(null);
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back to AI Care"
            accessibilityHint="Returns to the AI Care screen."
            hitSlop={8}
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: theme.headerButtonBg, borderColor: theme.headerButtonBorder }]}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text maxFontSizeMultiplier={1.15} style={[styles.title, { color: theme.text }]}>Smart Scan</Text>
            <Text maxFontSizeMultiplier={1.2} style={[styles.subtitle, { color: theme.textMuted }]}>AI analyzes your garment in seconds</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={[styles.analysisCard, { backgroundColor: theme.aiCareCardGlass, borderColor: theme.aiCareGlassBorder }]}>
          <View pointerEvents="none" style={[styles.glassHighlight, { backgroundColor: theme.aiCareGlassHighlight }]} />
          <View style={[styles.analysisLogo, { backgroundColor: isDark ? theme.aiBubbleBg : theme.surfaceElevated, borderColor: theme.aiBubbleBorder }]}>
            <AICareLogo size={compact ? 48 : 56} />
          </View>
          <View style={styles.analysisCopy}>
            <Text maxFontSizeMultiplier={1.2} style={[styles.analysisTitle, { color: theme.text }]}>Complete Garment Analysis</Text>
            <Text maxFontSizeMultiplier={1.25} style={[styles.analysisText, { color: theme.textMuted }]}>We examine your garment for type, stains, fabric, and care instructions.</Text>
          </View>
        </View>

        <View
          accessible
          accessibilityLabel={previewUri ? "Selected garment preview" : "Garment capture guide"}
          style={[styles.captureSurface, { height: captureHeight, backgroundColor: theme.smartScanBg, borderColor: theme.smartScanBorder }]}
        >
          {previewUri ? (
            <Image accessible={false} source={{ uri: previewUri }} resizeMode="cover" fadeDuration={0} style={styles.previewImage} />
          ) : (
            <LinearGradient
              pointerEvents="none"
              colors={isDark ? ["rgba(24,45,78,0.62)", "rgba(9,18,31,0.06)"] : ["rgba(225,237,255,0.85)", "rgba(255,255,255,0.18)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          )}

          <View pointerEvents="none" style={[styles.captureShade, { backgroundColor: isDark ? "rgba(3,10,20,0.20)" : "rgba(243,248,255,0.12)" }]} />
          <View pointerEvents="none" style={[styles.captureCorner, styles.topLeftCorner, { borderColor: theme.primary }]} />
          <View pointerEvents="none" style={[styles.captureCorner, styles.topRightCorner, { borderColor: theme.primary }]} />
          <View pointerEvents="none" style={[styles.captureCorner, styles.bottomLeftCorner, { borderColor: theme.primary }]} />
          <View pointerEvents="none" style={[styles.captureCorner, styles.bottomRightCorner, { borderColor: theme.primary }]} />

          {!previewUri ? (
            <View pointerEvents="none" style={styles.emptyCaptureContent}>
              <Image
                accessible={false}
                importantForAccessibility="no"
                source={shirtPlaceholder}
                resizeMode="contain"
                resizeMethod="resize"
                fadeDuration={0}
                style={[styles.placeholderShirt, { width: compact ? 136 : 166, height: compact ? 150 : 182, opacity: isDark ? 0.96 : 0.9 }]}
              />
            </View>
          ) : null}

          <View pointerEvents="none" style={[styles.captureFooter, { backgroundColor: isDark ? "rgba(10,20,35,0.76)" : "rgba(255,255,255,0.82)", borderColor: theme.aiCareGlassBorder }]}>
            <MaterialIcons name={previewUri ? "image" : "light-mode"} size={16} color={theme.primary} />
            <Text maxFontSizeMultiplier={1.2} style={[styles.captureFooterText, { color: theme.text }]}>{previewUri ? "Image ready for analysis" : "Position garment inside the frame"}</Text>
          </View>
        </View>

        {processing ? (
          <View style={[styles.processingCard, { backgroundColor: theme.homeSurfaceElevated, borderColor: theme.aiCareGlassBorder }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text maxFontSizeMultiplier={1.2} style={[styles.processingTitle, { color: theme.text }]}>Analyzing your garment…</Text>
            <Text maxFontSizeMultiplier={1.25} style={[styles.processingCopy, { color: theme.textMuted }]}>Preparing a reviewable result. This does not create a booking.</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancel analysis" onPress={cancelProcessing} style={[styles.cancelButton, { borderColor: theme.aiCareGlassBorder }]}>
              <Text maxFontSizeMultiplier={1.2} style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[styles.tipsCard, { backgroundColor: theme.aiCareCardGlass, borderColor: theme.aiCareGlassBorder }]}>
              <View pointerEvents="none" style={[styles.glassHighlight, { backgroundColor: theme.aiCareGlassHighlight }]} />
              <View style={styles.tipsHeading}>
                <MaterialIcons name="auto-awesome" size={17} color={theme.primary} />
                <Text maxFontSizeMultiplier={1.2} style={[styles.tipsTitle, { color: theme.text }]}>Tips for best results</Text>
              </View>
              <View style={[styles.tipsRow, compact && styles.tipsRowCompact]}>
                {scanTips.map((tip) => {
                  const tone = tip.tone === "warning" ? theme.warning : tip.tone === "accent" ? theme.accent : tip.tone === "primary" ? theme.primary : theme.text;
                  const surface = tip.tone === "warning" ? theme.surfaceAlt : tip.tone === "accent" ? theme.accentSoft : theme.primarySoft;
                  return (
                    <View key={tip.icon} style={[styles.tip, compact && styles.tipCompact]}>
                      <View style={[styles.tipIcon, { backgroundColor: surface, borderColor: theme.aiCareGlassBorder }]}>
                        <MaterialIcons name={tip.icon} size={20} color={tone} />
                      </View>
                      <Text maxFontSizeMultiplier={1.15} style={[styles.tipLabel, { color: theme.textMuted }]}>{tip.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={[styles.actions, compact && styles.actionsCompact]}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Take Photo"
                accessibilityHint="Opens the device camera to capture a garment."
                activeOpacity={0.92}
                disabled={processing}
                onPress={() => void startScan("camera")}
                style={[styles.actionCard, styles.cameraAction, compact && styles.actionCompact, { backgroundColor: theme.recommendationBg, borderColor: theme.recommendationBorder }]}
              >
                <View style={[styles.actionIcon, { backgroundColor: "rgba(255,255,255,0.14)", borderColor: "rgba(191,215,255,0.32)" }]}>
                  <MaterialIcons name="photo-camera" size={27} color="#FFFFFF" />
                </View>
                <View style={[styles.actionCopy, compact && styles.actionCopyCompact]}>
                  <Text maxFontSizeMultiplier={1.15} style={styles.cameraActionTitle}>Take Photo</Text>
                  <Text maxFontSizeMultiplier={1.2} style={styles.cameraActionText}>Use camera to capture garment</Text>
                </View>
                <MaterialIcons name="arrow-forward-ios" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Choose from Gallery"
                accessibilityHint="Opens the photo library to select a garment image."
                activeOpacity={0.92}
                disabled={processing}
                onPress={() => void startScan("gallery")}
                style={[styles.actionCard, compact && styles.actionCompact, { backgroundColor: theme.aiCareCardGlass, borderColor: theme.aiCareGlassBorder }]}
              >
                <View style={[styles.actionIcon, { backgroundColor: theme.accentSoft, borderColor: theme.aiCareGlassBorder }]}>
                  <MaterialIcons name="photo-library" size={27} color={theme.accent} />
                </View>
                <View style={[styles.actionCopy, compact && styles.actionCopyCompact]}>
                  <Text maxFontSizeMultiplier={1.15} style={[styles.galleryActionTitle, { color: theme.text }]}>Choose from Gallery</Text>
                  <Text maxFontSizeMultiplier={1.2} style={[styles.galleryActionText, { color: theme.textMuted }]}>Upload an existing garment photo</Text>
                </View>
                <MaterialIcons name="arrow-forward-ios" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {error ? (
          <View style={[styles.errorCard, { backgroundColor: theme.homeSurfaceElevated, borderColor: theme.danger }]}>
            <MaterialIcons name="info-outline" size={22} color={theme.danger} />
            <View style={styles.errorCopyWrap}>
              <Text maxFontSizeMultiplier={1.2} style={[styles.errorTitle, { color: theme.text }]}>{error.title}</Text>
              <Text maxFontSizeMultiplier={1.25} style={[styles.errorCopy, { color: theme.textMuted }]}>{error.message}</Text>
              {isDevelopmentBuild && error.diagnostic ? (
                <Text maxFontSizeMultiplier={1.15} style={[styles.diagnosticCopy, { color: theme.textMuted }]}>
                  Code: {error.diagnostic.code}
                  {typeof error.diagnostic.status === "number" ? ` • HTTP ${error.diagnostic.status}` : ""}
                  {error.diagnostic.requestId ? ` • Request: ${error.diagnostic.requestId}` : ""}
                </Text>
              ) : null}
              {error.retryable ? (
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Try another scan" onPress={() => setError(null)} style={[styles.retryButton, { borderColor: theme.aiCareGlassBorder }]}>
                  <Text maxFontSizeMultiplier={1.2} style={[styles.retryButtonText, { color: theme.text }]}>Try another scan</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        {!processing ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Continue with Manual Booking" accessibilityHint="Starts booking without Smart Scan." onPress={openManualBooking} style={styles.manualLink}>
            <Text maxFontSizeMultiplier={1.2} style={[styles.manualLinkText, { color: theme.primary }]}>Continue with Manual Booking</Text>
            <MaterialIcons name="arrow-forward" size={16} color={theme.primary} />
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: { minHeight: 62, flexDirection: "row", alignItems: "center" },
  backButton: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  headerSpacer: { width: 48 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "700", letterSpacing: -0.55 },
  subtitle: { marginTop: 2, fontSize: 13, lineHeight: 18, textAlign: "center" },
  analysisCard: { position: "relative", minHeight: 106, marginTop: 16, padding: 14, overflow: "hidden", borderRadius: homeDesign.actionRadius, borderWidth: 1, flexDirection: "row", alignItems: "center" },
  glassHighlight: { position: "absolute", top: 0, left: 16, right: 16, height: 1, borderRadius: 1 },
  analysisLogo: { width: 68, height: 68, borderRadius: 34, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  analysisCopy: { flex: 1, marginLeft: 13 },
  analysisTitle: { fontSize: 17, lineHeight: 22, fontWeight: "700", letterSpacing: -0.3 },
  analysisText: { marginTop: 5, fontSize: 13, lineHeight: 19 },
  captureSurface: { position: "relative", marginTop: 16, overflow: "hidden", borderRadius: homeDesign.cardRadius, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  previewImage: { ...StyleSheet.absoluteFillObject },
  captureShade: { ...StyleSheet.absoluteFillObject },
  captureCorner: { position: "absolute", width: 44, height: 44, borderWidth: 0 },
  topLeftCorner: { top: 20, left: 20, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 16 },
  topRightCorner: { top: 20, right: 20, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 16 },
  bottomLeftCorner: { bottom: 20, left: 20, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 16 },
  bottomRightCorner: { right: 20, bottom: 20, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 16 },
  emptyCaptureContent: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  placeholderShirt: { alignSelf: "center" },
  captureFooter: { position: "absolute", bottom: 16, minHeight: 34, borderRadius: 17, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row", alignItems: "center" },
  captureFooterText: { marginLeft: 6, fontSize: 12, fontWeight: "600" },
  tipsCard: { position: "relative", marginTop: 16, overflow: "hidden", borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 14 },
  tipsHeading: { flexDirection: "row", alignItems: "center" },
  tipsTitle: { marginLeft: 7, fontSize: 16, lineHeight: 21, fontWeight: "700" },
  tipsRow: { marginTop: 13, flexDirection: "row", justifyContent: "space-between", gap: 8 },
  tipsRowCompact: { flexWrap: "wrap", justifyContent: "center" },
  tip: { flex: 1, alignItems: "center" },
  tipCompact: { flexGrow: 0, flexBasis: "46%", marginBottom: 4 },
  tipIcon: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  tipLabel: { marginTop: 7, fontSize: 11.5, lineHeight: 16, textAlign: "center" },
  actions: { flexDirection: "row", gap: 12, marginTop: 16 },
  actionsCompact: { flexDirection: "column" },
  actionCard: { flex: 1, minHeight: 118, borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 13, justifyContent: "space-between" },
  actionCompact: { minHeight: 96, flexDirection: "row", alignItems: "center", gap: 11 },
  cameraAction: { shadowColor: "#2563EB", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  actionIcon: { width: 48, height: 48, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  actionCopy: { flex: 1, marginTop: 10 },
  actionCopyCompact: { marginTop: 0 },
  cameraActionTitle: { color: "#FFFFFF", fontSize: 16, lineHeight: 20, fontWeight: "700", letterSpacing: -0.25 },
  cameraActionText: { marginTop: 4, color: "rgba(226,236,255,0.82)", fontSize: 12, lineHeight: 17 },
  galleryActionTitle: { fontSize: 16, lineHeight: 20, fontWeight: "700", letterSpacing: -0.25 },
  galleryActionText: { marginTop: 4, fontSize: 12, lineHeight: 17 },
  processingCard: { minHeight: 184, marginTop: 16, borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 22, alignItems: "center", justifyContent: "center" },
  processingTitle: { marginTop: 14, fontSize: 19, lineHeight: 25, fontWeight: "700" },
  processingCopy: { marginTop: 6, maxWidth: 270, fontSize: 13, lineHeight: 19, textAlign: "center" },
  cancelButton: { minWidth: 112, minHeight: 42, marginTop: 15, borderRadius: 21, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 15 },
  cancelButtonText: { fontSize: 14, fontWeight: "700" },
  errorCard: { marginTop: 16, borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 15, flexDirection: "row", alignItems: "flex-start" },
  errorCopyWrap: { flex: 1, marginLeft: 10 },
  errorTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  errorCopy: { marginTop: 3, fontSize: 13, lineHeight: 18 },
  diagnosticCopy: { marginTop: 7, fontSize: 11, lineHeight: 16 },
  retryButton: { alignSelf: "flex-start", minHeight: 40, marginTop: 11, borderRadius: 20, borderWidth: 1, paddingHorizontal: 13, alignItems: "center", justifyContent: "center" },
  retryButtonText: { fontSize: 13, fontWeight: "700" },
  manualLink: { alignSelf: "center", minHeight: 48, marginTop: 12, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  manualLinkText: { marginRight: 5, fontSize: 14, fontWeight: "700" },
});
