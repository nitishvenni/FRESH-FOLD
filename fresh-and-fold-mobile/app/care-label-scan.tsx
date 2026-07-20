import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "../components/Card";
import { useAppTheme } from "../hooks/useAppTheme";
import { AiServiceError, analyzeCareLabel } from "../services/aiService";
import { AiDevelopmentDiagnostic, toAiDevelopmentDiagnostic } from "../services/aiErrors";
import { selectAiImage } from "../utils/aiImage";

type ScanError = {
  title: string;
  message: string;
  retryable: boolean;
  diagnostic?: AiDevelopmentDiagnostic;
};

type CareCategory = {
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
};

const careCategories: readonly CareCategory[] = [
  { label: "Washing", icon: "local-laundry-service" },
  { label: "Bleaching", icon: "opacity" },
  { label: "Drying", icon: "wb-sunny" },
  { label: "Ironing", icon: "iron" },
  { label: "Dry clean", icon: "dry-cleaning" },
];

const howItWorks = [
  { number: "1", title: "Capture", copy: "Take a clear photo of the care label.", icon: "photo-camera" as const },
  { number: "2", title: "AI reads", copy: "Visible text and supported symbols are extracted.", icon: "auto-awesome" as const },
  { number: "3", title: "Review", copy: "Check advisory guidance against the physical label.", icon: "verified-user" as const },
];

const isDevelopmentBuild = typeof __DEV__ !== "undefined" && __DEV__;

const errorFrom = (error: unknown): ScanError => {
  if (error instanceof AiServiceError) {
    if (error.code === "AI_NOT_CONFIGURED") {
      return {
        title: "Care Label Reader unavailable",
        message: "Care Label Reader is not configured right now. You can continue with Manual Booking.",
        retryable: false,
      };
    }

    return {
      title: "Care-label analysis could not finish",
      message: error.message,
      retryable: error.retryable,
      ...(isDevelopmentBuild ? { diagnostic: toAiDevelopmentDiagnostic(error) } : {}),
    };
  }

  return {
    title: "Care-label analysis could not finish",
    message: "Please try again or continue with Manual Booking.",
    retryable: true,
  };
};

export default function CareLabelScanScreen() {
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
        message: "Allow access to choose a care-label image, or continue with Manual Booking.",
        retryable: true,
      });
      return;
    }

    setPreviewUri(selected.image.uri);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setProcessing(true);

    try {
      const result = await analyzeCareLabel(selected.image, controller.signal);
      if (!controller.signal.aborted) {
        router.replace({
          pathname: "/care-label-analysis" as never,
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

  const heroColors = isDark
    ? (["#10284F", "#14203B", "#0D1728"] as const)
    : (["#E5EEFF", "#F8FAFF", "#EAF1FF"] as const);
  const heroText = isDark ? "#F8FAFC" : "#0C2B78";
  const heroMuted = isDark ? "#C7D6EE" : "#244CA5";

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 10 }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 34 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Back to AI Care"
            style={[styles.headerButton, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={23} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Care Label Reader</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={[styles.intro, { color: theme.textMuted }]}>Scan visible care-label text and supported symbols, then review advisory guidance.</Text>

        <LinearGradient colors={heroColors} style={[styles.hero, { borderColor: isDark ? "#294D80" : "#CEDDFF" }]}>
          <View style={styles.heroCopy}>
            <View style={[styles.scanIcon, { backgroundColor: isDark ? "rgba(89,145,255,0.18)" : "rgba(37,99,235,0.10)" }]}>
              <MaterialIcons name="document-scanner" size={27} color={isDark ? "#9CC2FF" : theme.primary} />
            </View>
            <Text style={[styles.heroTitle, { color: heroText }]}>Scan Care Label</Text>
            <Text style={[styles.heroSubtitle, { color: heroMuted }]}>Position the label clearly in the frame to read what is visible.</Text>
          </View>
          <View style={[styles.labelVisual, { backgroundColor: isDark ? "#E7EDF8" : "#FFFFFF", borderColor: isDark ? "#A9B8CD" : "#D7E2F7" }]}>
            <View style={styles.labelTopLine} />
            <View style={styles.labelSymbols}>
              <MaterialIcons name="local-laundry-service" size={22} color="#36599A" />
              <MaterialIcons name="do-not-disturb-on" size={19} color="#36599A" />
              <MaterialIcons name="iron" size={20} color="#36599A" />
              <MaterialIcons name="dry-cleaning" size={20} color="#36599A" />
            </View>
            <View style={styles.labelLines}>
              <View style={styles.labelLine} />
              <View style={[styles.labelLine, styles.labelShortLine]} />
              <View style={styles.labelLine} />
            </View>
          </View>

          {processing ? (
            <View style={styles.processingHero}>
              {previewUri ? <Image accessibilityLabel="Selected care-label preview" source={{ uri: previewUri }} style={styles.processingPreview} /> : null}
              <View style={styles.processingContent}>
                <ActivityIndicator size="small" color={isDark ? "#B7D1FF" : theme.primary} />
                <Text style={[styles.processingTitle, { color: heroText }]}>Reading care label</Text>
                <Text style={[styles.processingCopy, { color: heroMuted }]}>Extracting visible evidence only. This does not create a booking.</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" style={[styles.cancelButton, { borderColor: isDark ? "#7696C8" : "#B8CCF4" }]} onPress={cancelProcessing}>
                <Text style={[styles.cancelText, { color: heroText }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.heroActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Take a photo of a care label"
                style={[styles.photoAction, { backgroundColor: theme.primary }]}
                onPress={() => void startScan("camera")}
              >
                <MaterialIcons name="photo-camera" size={24} color="#FFFFFF" />
                <View>
                  <Text style={styles.photoActionTitle}>Take Photo</Text>
                  <Text style={styles.photoActionCaption}>Use camera</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Choose a care-label photo from gallery"
                style={[styles.galleryAction, { backgroundColor: isDark ? "rgba(34,29,97,0.86)" : "#FFFFFF", borderColor: isDark ? "#514AAB" : "#C9D8FF" }]}
                onPress={() => void startScan("gallery")}
              >
                <MaterialIcons name="photo-library" size={24} color={isDark ? "#BCB5FF" : theme.accent} />
                <View>
                  <Text style={[styles.galleryActionTitle, { color: heroText }]}>Choose from</Text>
                  <Text style={[styles.galleryActionTitle, { color: heroText }]}>Gallery</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>

        {error ? (
          <Card style={[styles.errorCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <MaterialIcons name="info-outline" size={23} color={theme.warning} />
            <View style={styles.errorBody}>
              <Text style={[styles.errorTitle, { color: theme.text }]}>{error.title}</Text>
              <Text style={[styles.errorCopy, { color: theme.textMuted }]}>{error.message}</Text>
              {isDevelopmentBuild && error.diagnostic ? <Text style={[styles.diagnosticCopy, { color: theme.textMuted }]}>Code: {error.diagnostic.code}{typeof error.diagnostic.status === "number" ? ` • HTTP ${error.diagnostic.status}` : ""}{error.diagnostic.requestId ? ` • Request: ${error.diagnostic.requestId}` : ""}</Text> : null}
              {error.retryable ? <TouchableOpacity accessibilityRole="button" style={[styles.retryButton, { borderColor: theme.border }]} onPress={() => setError(null)}><Text style={[styles.retryButtonText, { color: theme.text }]}>Try another photo</Text></TouchableOpacity> : null}
            </View>
          </Card>
        ) : null}

        <View style={[styles.privacyNote, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <View style={[styles.privacyIcon, { backgroundColor: theme.primarySoft }]}><MaterialIcons name="verified-user" size={22} color={theme.primary} /></View>
          <Text style={[styles.privacyCopy, { color: theme.textMuted }]}>Fresh & Fold handles this upload in memory for analysis and does not persist it on our backend.</Text>
        </View>

        <Card style={[styles.sectionCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>How it works</Text>
          <View style={styles.steps}>
            {howItWorks.map((step, index) => (
              <View key={step.number} style={styles.step}>
                <View style={[styles.stepIcon, { backgroundColor: theme.primarySoft, borderColor: theme.border }]}>
                  <MaterialIcons name={step.icon} size={25} color={theme.primary} />
                </View>
                {index < howItWorks.length - 1 ? <View style={[styles.stepConnector, { backgroundColor: theme.primary }]} /> : null}
                <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}><Text style={styles.stepNumberText}>{step.number}</Text></View>
                <Text style={[styles.stepTitle, { color: theme.text }]}>{step.title}</Text>
                <Text style={[styles.stepCopy, { color: theme.textMuted }]}>{step.copy}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={[styles.sectionCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Supported care guidance</Text>
          <Text style={[styles.sectionIntro, { color: theme.textMuted }]}>The reader can report visible evidence for these care categories.</Text>
          <View style={styles.categoryGrid}>
            {careCategories.map((category) => (
              <View key={category.label} style={styles.category}>
                <View style={[styles.categoryIcon, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}><MaterialIcons name={category.icon} size={25} color={theme.primary} /></View>
                <Text style={[styles.categoryText, { color: theme.text }]}>{category.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={[styles.tipsCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <View style={[styles.tipsVisual, { backgroundColor: theme.primarySoft }]}>
            <MaterialIcons name="center-focus-strong" size={44} color={theme.primary} />
            <MaterialIcons name="local-laundry-service" size={32} color={theme.primary} />
          </View>
          <View style={styles.tipsContent}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Tips for best results</Text>
            {[
              "Use good lighting and keep the label in focus.",
              "Keep the whole label flat and fully visible.",
              "Avoid shadows, glare, and blurry photos.",
            ].map((tip) => <View key={tip} style={styles.tip}><MaterialIcons name="check-circle" size={18} color={theme.primary} /><Text style={[styles.tipText, { color: theme.textMuted }]}>{tip}</Text></View>)}
          </View>
        </Card>

        {!processing ? <TouchableOpacity accessibilityRole="button" style={styles.manualLink} onPress={() => router.push("/select-service")}><Text style={[styles.manualLinkText, { color: theme.primary }]}>Continue with Manual Booking</Text></TouchableOpacity> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerButton: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerSpacer: { width: 48 },
  headerTitle: { fontSize: 23, fontWeight: "800", letterSpacing: -0.4 },
  intro: { marginTop: 8, paddingHorizontal: 12, fontSize: 15, lineHeight: 22, textAlign: "center" },
  hero: { position: "relative", minHeight: 292, marginTop: 24, padding: 20, borderWidth: 1, borderRadius: 24, overflow: "hidden" },
  heroCopy: { width: "66%" },
  scanIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  heroTitle: { marginTop: 13, fontSize: 20, lineHeight: 25, fontWeight: "800" },
  heroSubtitle: { marginTop: 7, fontSize: 14, lineHeight: 20, fontWeight: "500" },
  labelVisual: { position: "absolute", top: 20, right: 18, width: 96, minHeight: 142, borderRadius: 8, borderWidth: 1, padding: 11, transform: [{ rotate: "8deg" }], shadowColor: "#1E3A6D", shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  labelTopLine: { width: 31, height: 4, borderRadius: 4, backgroundColor: "#5A719B" },
  labelSymbols: { marginTop: 11, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  labelLines: { marginTop: 12, gap: 5 },
  labelLine: { height: 3, borderRadius: 3, backgroundColor: "#AAB9D0" },
  labelShortLine: { width: "68%" },
  heroActions: { position: "absolute", right: 16, bottom: 16, left: 16, flexDirection: "row", gap: 10 },
  photoAction: { flex: 1, minHeight: 78, borderRadius: 16, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, shadowColor: "#0C3D9B", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  photoActionTitle: { color: "#FFFFFF", fontSize: 14, lineHeight: 18, fontWeight: "800" },
  photoActionCaption: { marginTop: 2, color: "rgba(255,255,255,0.82)", fontSize: 12, lineHeight: 16, fontWeight: "600" },
  galleryAction: { flex: 1, minHeight: 78, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  galleryActionTitle: { fontSize: 13, lineHeight: 16, fontWeight: "800" },
  processingHero: { position: "absolute", right: 16, bottom: 16, left: 16, minHeight: 90, flexDirection: "row", alignItems: "center", padding: 11, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.14)" },
  processingPreview: { width: 62, height: 62, borderRadius: 11, resizeMode: "cover" },
  processingContent: { flex: 1, marginHorizontal: 11 },
  processingTitle: { marginTop: 5, fontSize: 14, fontWeight: "800" },
  processingCopy: { marginTop: 3, fontSize: 11.5, lineHeight: 16, fontWeight: "500" },
  cancelButton: { minHeight: 36, borderWidth: 1, borderRadius: 11, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 12, fontWeight: "800" },
  privacyNote: { flexDirection: "row", alignItems: "center", gap: 11, marginTop: 16, padding: 13, borderWidth: 1, borderRadius: 17 },
  privacyIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  privacyCopy: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "500" },
  sectionCard: { marginTop: 16, borderRadius: 22, padding: 16 },
  sectionTitle: { fontSize: 17, lineHeight: 22, fontWeight: "800", letterSpacing: -0.2 },
  sectionIntro: { marginTop: 5, fontSize: 13, lineHeight: 19 },
  steps: { flexDirection: "row", marginTop: 19 },
  step: { flex: 1, alignItems: "center" },
  stepIcon: { width: 55, height: 55, borderWidth: 1, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  stepConnector: { position: "absolute", top: 27, left: "72%", width: "56%", height: 1, opacity: 0.65 },
  stepNumber: { width: 21, height: 21, marginTop: 7, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  stepNumberText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  stepTitle: { marginTop: 8, fontSize: 13, lineHeight: 17, fontWeight: "800", textAlign: "center" },
  stepCopy: { marginTop: 4, paddingHorizontal: 2, fontSize: 11.5, lineHeight: 16, textAlign: "center" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10, marginTop: 16 },
  category: { width: "30%", alignItems: "center" },
  categoryIcon: { width: 58, height: 58, borderWidth: 1, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  categoryText: { marginTop: 7, fontSize: 11.5, lineHeight: 16, fontWeight: "700", textAlign: "center" },
  tipsCard: { minHeight: 178, marginTop: 16, borderRadius: 22, padding: 16, flexDirection: "row", overflow: "hidden" },
  tipsContent: { flex: 1, zIndex: 1 },
  tipsVisual: { position: "absolute", right: -7, bottom: -11, width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center", opacity: 0.72 },
  tip: { flexDirection: "row", alignItems: "flex-start", gap: 7, marginTop: 11, paddingRight: 62 },
  tipText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  errorCard: { flexDirection: "row", marginTop: 16, borderRadius: 20, padding: 15 },
  errorBody: { flex: 1, marginLeft: 10 },
  errorTitle: { fontSize: 15, lineHeight: 20, fontWeight: "800" },
  errorCopy: { marginTop: 4, fontSize: 13, lineHeight: 19 },
  diagnosticCopy: { marginTop: 7, fontSize: 11, lineHeight: 16 },
  retryButton: { alignSelf: "flex-start", minHeight: 36, marginTop: 10, paddingHorizontal: 11, borderWidth: 1, borderRadius: 10, justifyContent: "center" },
  retryButtonText: { fontSize: 12, fontWeight: "800" },
  manualLink: { alignSelf: "center", minHeight: 48, justifyContent: "center", marginTop: 17, paddingHorizontal: 12 },
  manualLinkText: { fontSize: 14, fontWeight: "800" },
});
