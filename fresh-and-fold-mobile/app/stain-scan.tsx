import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../hooks/useAppTheme";
import { AiServiceError, analyzeStain } from "../services/aiService";
import { AiDevelopmentDiagnostic, toAiDevelopmentDiagnostic } from "../services/aiErrors";
import { homeDesign } from "../theme/theme";
import { selectAiImage } from "../utils/aiImage";

type ScanError = {
  title: string;
  message: string;
  retryable: boolean;
  diagnostic?: AiDevelopmentDiagnostic;
};

type CaptureSource = "camera" | "gallery";

const isDevelopmentBuild = typeof __DEV__ !== "undefined" && __DEV__;

const tips = [
  { icon: "light-mode" as const, label: "Good\nlighting", tone: "warning" as const },
  { icon: "center-focus-strong" as const, label: "Keep in\nfocus", tone: "primary" as const },
  { icon: "checkroom" as const, label: "Show the stain\nclearly", tone: "primary" as const },
  { icon: "image" as const, label: "Plain\nbackground", tone: "accent" as const },
];

const errorFrom = (error: unknown): ScanError => {
  if (error instanceof AiServiceError) {
    if (error.code === "AI_NOT_CONFIGURED") {
      return {
        title: "Stain Detection unavailable",
        message: "Stain detection is not configured right now. You can continue with Manual Booking.",
        retryable: false,
      };
    }

    if (error.code === "AI_RATE_LIMITED") {
      return {
        title: "AI analysis is busy",
        message: "AI analysis is temporarily busy. Please try again shortly.",
        retryable: true,
        ...(isDevelopmentBuild ? { diagnostic: toAiDevelopmentDiagnostic(error) } : {}),
      };
    }

    if (error.code === "AI_INVALID_PROVIDER_RESPONSE") {
      return {
        title: "Analysis needs another try",
        message: "We could not prepare a reliable stain result from that response. Please try another photo.",
        retryable: true,
        ...(isDevelopmentBuild ? { diagnostic: toAiDevelopmentDiagnostic(error) } : {}),
      };
    }

    return {
      title: "Stain analysis could not finish",
      message: error.message,
      retryable: error.retryable,
      ...(isDevelopmentBuild ? { diagnostic: toAiDevelopmentDiagnostic(error) } : {}),
    };
  }

  return {
    title: "Stain analysis could not finish",
    message: "Please try again or continue with Manual Booking.",
    retryable: true,
  };
};

function HowItWorksStep({ number, icon, title, copy, isLast }: { number: number; icon: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; copy: string; isLast: boolean }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.step}>
      {!isLast ? <View pointerEvents="none" style={[styles.stepConnector, { backgroundColor: theme.aiCareGlassBorder }]} /> : null}
      <View style={[styles.stepIcon, { backgroundColor: theme.primarySoft, borderColor: theme.aiCareGlassBorder }]}>
        <MaterialIcons name={icon} size={27} color={theme.primary} />
      </View>
      <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}><Text style={styles.stepNumberText}>{number}</Text></View>
      <Text maxFontSizeMultiplier={1.15} style={[styles.stepTitle, { color: theme.text }]}>{title}</Text>
      <Text maxFontSizeMultiplier={1.2} style={[styles.stepCopy, { color: theme.textMuted }]}>{copy}</Text>
    </View>
  );
}

export default function StainScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { theme, isDark } = useAppTheme();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [processing, setProcessing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [error, setError] = useState<ScanError | null>(null);
  const compact = width < 360;

  const startScan = useCallback(async (source: CaptureSource) => {
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
        message: "Allow access to choose a stain image, or continue with Manual Booking.",
        retryable: true,
      });
      return;
    }

    setPreviewUri(selected.image.uri);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setProcessing(true);

    try {
      const result = await analyzeStain(selected.image, controller.signal);
      if (!controller.signal.aborted) {
        router.replace({
          pathname: "/stain-analysis" as never,
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
  }, [processing, router]);

  const cancelProcessing = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setProcessing(false);
    setPreviewUri(null);
  }, []);

  const openManualBooking = useCallback(() => router.push("/select-service"), [router]);
  const goBack = useCallback(() => router.back(), [router]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}
      >
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back to AI Care" accessibilityHint="Returns to the AI Care screen." hitSlop={8} onPress={goBack} style={[styles.backButton, { backgroundColor: theme.headerButtonBg, borderColor: theme.headerButtonBorder }]}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text maxFontSizeMultiplier={1.15} style={[styles.title, { color: theme.text }]}>Stain Detection</Text>
            <Text maxFontSizeMultiplier={1.2} style={[styles.subtitle, { color: theme.textMuted }]}>AI identifies stains and recommends the best treatment.</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={[styles.heroCard, { backgroundColor: theme.aiCareCardGlass, borderColor: theme.aiCareGlassBorder }]}>
          <View pointerEvents="none" style={[styles.glassHighlight, { backgroundColor: theme.aiCareGlassHighlight }]} />
          <View style={[styles.heroIcon, { backgroundColor: isDark ? theme.aiBubbleBg : theme.primarySoft, borderColor: theme.aiCareGlassBorder }]}>
            <Image 
              source={require("../assets/images/brand/stain-scan-logo.jpg")} 
              style={{ width: 74, height: 74, borderRadius: 27 }} 
              resizeMode="cover" 
            />
          </View>
          <View style={styles.heroCopy}>
            <Text maxFontSizeMultiplier={1.2} style={[styles.heroTitle, { color: theme.text }]}>Smart Stain Analysis</Text>
            <Text maxFontSizeMultiplier={1.2} style={[styles.heroBullet, { color: theme.textMuted }]}>• Detects possible stain types</Text>
            <Text maxFontSizeMultiplier={1.2} style={[styles.heroBullet, { color: theme.textMuted }]}>• Provides advisory treatment guidance</Text>
            <Text maxFontSizeMultiplier={1.2} style={[styles.heroBullet, { color: theme.textMuted }]}>• Helps choose suitable cleaning care</Text>
          </View>
        </View>

        {previewUri ? (
          <View style={[styles.previewCard, { backgroundColor: theme.homeSurfaceElevated, borderColor: theme.aiCareGlassBorder }]}>
            <Image accessible accessibilityLabel="Selected stain preview" source={{ uri: previewUri }} resizeMode="cover" fadeDuration={0} style={styles.previewImage} />
            <View style={styles.previewCopyWrap}>
              <Text maxFontSizeMultiplier={1.2} style={[styles.previewTitle, { color: theme.text }]}>Selected stain photo</Text>
              <Text maxFontSizeMultiplier={1.2} style={[styles.previewCopy, { color: theme.textMuted }]}>This photo is being used for the current analysis.</Text>
            </View>
          </View>
        ) : null}

        {processing ? (
          <View style={[styles.processingCard, { backgroundColor: theme.homeSurfaceElevated, borderColor: theme.aiCareGlassBorder }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text maxFontSizeMultiplier={1.2} style={[styles.processingTitle, { color: theme.text }]}>Analyzing stain…</Text>
            <Text maxFontSizeMultiplier={1.25} style={[styles.processingCopy, { color: theme.textMuted }]}>Preparing cautious care guidance. This does not create a booking.</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancel stain analysis" onPress={cancelProcessing} style={[styles.cancelButton, { borderColor: theme.aiCareGlassBorder }]}>
              <Text maxFontSizeMultiplier={1.2} style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[styles.howCard, { backgroundColor: theme.aiCareCardGlass, borderColor: theme.aiCareGlassBorder }]}>
              <View pointerEvents="none" style={[styles.glassHighlight, { backgroundColor: theme.aiCareGlassHighlight }]} />
              <Text maxFontSizeMultiplier={1.2} style={[styles.sectionTitle, { color: theme.text }]}>How it works</Text>
              <View style={styles.steps}>
                <HowItWorksStep number={1} icon="photo-camera" title="Capture Stain" copy="Take a clear photo of the stained area." isLast={false} />
                <HowItWorksStep number={2} icon="search" title="AI Analyzes" copy="AI reviews possible stain characteristics." isLast={false} />
                <HowItWorksStep number={3} icon="fact-check" title="Get Guidance" copy="Receive advisory stain-care guidance." isLast />
              </View>
            </View>

            <View style={[styles.tipsCard, { backgroundColor: theme.aiCareCardGlass, borderColor: theme.aiCareGlassBorder }]}>
              <View pointerEvents="none" style={[styles.glassHighlight, { backgroundColor: theme.aiCareGlassHighlight }]} />
              <Text maxFontSizeMultiplier={1.2} style={[styles.sectionTitle, { color: theme.text }]}>Tips for best results</Text>
              <View style={[styles.tipsRow, compact && styles.tipsRowCompact]}>
                {tips.map((tip) => {
                  const color = tip.tone === "warning" ? theme.warning : tip.tone === "accent" ? theme.accent : theme.primary;
                  const surface = tip.tone === "accent" ? theme.accentSoft : tip.tone === "warning" ? theme.surfaceAlt : theme.primarySoft;
                  return (
                    <View key={tip.icon} style={[styles.tip, compact && styles.tipCompact]}>
                      <View style={[styles.tipIcon, { backgroundColor: surface, borderColor: theme.aiCareGlassBorder }]}><MaterialIcons name={tip.icon} size={22} color={color} /></View>
                      <Text maxFontSizeMultiplier={1.15} style={[styles.tipText, { color: theme.textMuted }]}>{tip.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Take Photo" accessibilityHint="Opens the device camera to capture a stain." activeOpacity={0.92} onPress={() => void startScan("camera")} style={[styles.actionCard, styles.cameraAction, { backgroundColor: theme.recommendationBg, borderColor: theme.recommendationBorder }]}>
                <View style={[styles.actionIcon, { backgroundColor: "rgba(255,255,255,0.14)", borderColor: "rgba(191,215,255,0.32)" }]}><MaterialIcons name="photo-camera" size={28} color="#FFFFFF" /></View>
                <View style={styles.actionCopy}>
                  <Text maxFontSizeMultiplier={1.15} style={styles.cameraActionTitle}>Take Photo</Text>
                  <Text maxFontSizeMultiplier={1.2} style={styles.cameraActionText}>Use camera to capture the stain</Text>
                </View>
                <MaterialIcons name="arrow-forward-ios" size={19} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Choose from Gallery" accessibilityHint="Opens the photo library to select a stain image." activeOpacity={0.92} onPress={() => void startScan("gallery")} style={[styles.actionCard, { backgroundColor: theme.aiCareCardGlass, borderColor: theme.aiCareGlassBorder }]}>
                <View style={[styles.actionIcon, { backgroundColor: theme.accentSoft, borderColor: theme.aiCareGlassBorder }]}><MaterialIcons name="photo-library" size={28} color={theme.accent} /></View>
                <View style={styles.actionCopy}>
                  <Text maxFontSizeMultiplier={1.15} style={[styles.galleryActionTitle, { color: theme.text }]}>Choose from Gallery</Text>
                  <Text maxFontSizeMultiplier={1.2} style={[styles.galleryActionText, { color: theme.textMuted }]}>Upload an existing photo of the stain</Text>
                </View>
                <MaterialIcons name="arrow-forward-ios" size={19} color={theme.textMuted} />
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
              {isDevelopmentBuild && error.diagnostic ? <Text maxFontSizeMultiplier={1.15} style={[styles.diagnosticCopy, { color: theme.textMuted }]}>Code: {error.diagnostic.code}{typeof error.diagnostic.status === "number" ? ` • HTTP ${error.diagnostic.status}` : ""}{error.diagnostic.requestId ? ` • Request: ${error.diagnostic.requestId}` : ""}</Text> : null}
              {error.retryable ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Try another stain photo" onPress={() => setError(null)} style={[styles.retryButton, { borderColor: theme.aiCareGlassBorder }]}><Text maxFontSizeMultiplier={1.2} style={[styles.retryText, { color: theme.text }]}>Try another photo</Text></TouchableOpacity> : null}
            </View>
          </View>
        ) : null}

        {!processing ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Continue with Manual Booking" accessibilityHint="Starts booking without Stain Detection." onPress={openManualBooking} style={styles.manualLink}>
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
  header: { minHeight: 64, flexDirection: "row", alignItems: "center" },
  backButton: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  headerSpacer: { width: 48 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "700", letterSpacing: -0.55 },
  subtitle: { marginTop: 3, maxWidth: 280, fontSize: 13, lineHeight: 18, textAlign: "center" },
  glassHighlight: { position: "absolute", top: 0, left: 16, right: 16, height: 1, borderRadius: 1 },
  heroCard: { position: "relative", minHeight: 150, marginTop: 16, overflow: "hidden", borderRadius: homeDesign.cardRadius, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center" },
  heroIcon: { width: 78, height: 78, borderRadius: 29, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  heroIconBadge: { position: "absolute", right: -4, bottom: -4, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  heroCopy: { flex: 1, marginLeft: 15 },
  heroTitle: { fontSize: 18, lineHeight: 23, fontWeight: "700", letterSpacing: -0.3 },
  heroBullet: { marginTop: 5, fontSize: 12.5, lineHeight: 18 },
  previewCard: { minHeight: 102, marginTop: 14, borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 10, flexDirection: "row", alignItems: "center" },
  previewImage: { width: 82, height: 82, borderRadius: 14 },
  previewCopyWrap: { flex: 1, marginLeft: 12 },
  previewTitle: { fontSize: 16, lineHeight: 21, fontWeight: "700" },
  previewCopy: { marginTop: 4, fontSize: 12.5, lineHeight: 18 },
  howCard: { position: "relative", marginTop: 14, overflow: "hidden", borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 14 },
  sectionTitle: { fontSize: 18, lineHeight: 23, fontWeight: "700", letterSpacing: -0.3 },
  steps: { flexDirection: "row", marginTop: 17 },
  step: { position: "relative", flex: 1, alignItems: "center" },
  stepConnector: { position: "absolute", top: 23, left: "64%", width: "72%", height: 1 },
  stepIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepNumber: { width: 22, height: 22, marginTop: -2, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  stepNumberText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  stepTitle: { marginTop: 8, fontSize: 12.5, lineHeight: 17, fontWeight: "700", textAlign: "center" },
  stepCopy: { marginTop: 4, paddingHorizontal: 2, fontSize: 10.5, lineHeight: 15, textAlign: "center" },
  tipsCard: { position: "relative", marginTop: 14, overflow: "hidden", borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 14 },
  tipsRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginTop: 14 },
  tipsRowCompact: { flexWrap: "wrap", justifyContent: "center" },
  tip: { flex: 1, alignItems: "center" },
  tipCompact: { flexGrow: 0, flexBasis: "46%", marginBottom: 4 },
  tipIcon: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  tipText: { marginTop: 7, fontSize: 11.5, lineHeight: 16, textAlign: "center" },
  actions: { gap: 12, marginTop: 16 },
  actionCard: { minHeight: 112, borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center" },
  cameraAction: { shadowColor: "#2563EB", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  actionIcon: { width: 54, height: 54, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  actionCopy: { flex: 1, marginLeft: 13 },
  cameraActionTitle: { color: "#FFFFFF", fontSize: 18, lineHeight: 23, fontWeight: "700", letterSpacing: -0.3 },
  cameraActionText: { marginTop: 4, color: "rgba(226,236,255,0.82)", fontSize: 13, lineHeight: 19 },
  galleryActionTitle: { fontSize: 18, lineHeight: 23, fontWeight: "700", letterSpacing: -0.3 },
  galleryActionText: { marginTop: 4, fontSize: 13, lineHeight: 19 },
  processingCard: { minHeight: 192, marginTop: 14, borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 22, alignItems: "center", justifyContent: "center" },
  processingTitle: { marginTop: 14, fontSize: 19, lineHeight: 25, fontWeight: "700" },
  processingCopy: { marginTop: 6, maxWidth: 270, fontSize: 13, lineHeight: 19, textAlign: "center" },
  cancelButton: { minWidth: 112, minHeight: 42, marginTop: 15, borderRadius: 21, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 15 },
  cancelButtonText: { fontSize: 14, fontWeight: "700" },
  errorCard: { marginTop: 14, borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "flex-start" },
  errorCopyWrap: { flex: 1, marginLeft: 10 },
  errorTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  errorCopy: { marginTop: 3, fontSize: 13, lineHeight: 18 },
  diagnosticCopy: { marginTop: 7, fontSize: 11, lineHeight: 16 },
  retryButton: { alignSelf: "flex-start", minHeight: 40, marginTop: 11, borderRadius: 20, borderWidth: 1, paddingHorizontal: 13, alignItems: "center", justifyContent: "center" },
  retryText: { fontSize: 13, fontWeight: "700" },
  manualLink: { alignSelf: "center", minHeight: 48, marginTop: 10, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  manualLinkText: { marginRight: 5, fontSize: 14, fontWeight: "700" },
});
