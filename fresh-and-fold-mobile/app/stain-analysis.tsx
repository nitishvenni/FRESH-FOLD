import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "../components/Card";
import { useAppTheme } from "../hooks/useAppTheme";
import type { StainAnalysisResult, StainType } from "../types/ai";

const validStainTypes = new Set<StainType>([
  "coffee",
  "blood",
  "oil",
  "ink",
  "mud",
  "wine",
  "grass",
  "sweat",
  "unknown",
]);

const stainName = (stain: StainType | null) => {
  if (stain === null) return "No stain detected";
  if (stain === "unknown") return "Unknown stain";
  return `${stain[0].toUpperCase()}${stain.slice(1)} stain`;
};

const serviceName = (service: "wash" | "dry" | "express") => {
  if (service === "dry") return "Dry Cleaning";
  if (service === "express") return "Express Service";
  return "Wash & Fold";
};

const statusTitle = (status: StainAnalysisResult["status"]) => {
  if (status === "partial") return "Partial analysis";
  if (status === "no_match") return "No stain found";
  if (status === "unreadable") return "Image needs another try";
  return "Stain analysis";
};

const parseResult = (value: string | string[] | undefined): StainAnalysisResult | null => {
  if (typeof value !== "string") return null;

  try {
    const result = JSON.parse(value) as StainAnalysisResult;
    const guidance = result.careGuidance;
    const hasValidStain = result.stain === null || validStainTypes.has(result.stain);
    const hasValidConfidence = result.confidence === null || (typeof result.confidence === "number" && result.confidence >= 0 && result.confidence <= 1);
    const hasValidGuidance =
      guidance &&
      typeof guidance === "object" &&
      (typeof guidance.cleaningRecommendation === "string" || guidance.cleaningRecommendation === null) &&
      (typeof guidance.specialTreatment === "string" || guidance.specialTreatment === null) &&
      Array.isArray(guidance.safetyNotes) &&
      guidance.safetyNotes.every((note) => typeof note === "string") &&
      ["wash", "dry", "express", null].includes(guidance.serviceRecommendation);

    if (!hasValidStain || !hasValidConfidence || !hasValidGuidance || !Array.isArray(result.warnings)) {
      return null;
    }

    if ((result.status === "no_match" && (result.stain !== null || result.confidence !== null)) || (result.stain === null && result.status !== "no_match")) {
      return null;
    }

    return result;
  } catch {
    return null;
  }
};

export default function StainAnalysisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { result: resultParam } = useLocalSearchParams<{ result?: string }>();
  const result = parseResult(resultParam);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 18 }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <TouchableOpacity accessibilityRole="button" style={styles.back} onPress={() => router.replace("/stain-scan" as never)}>
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Stain Detection</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>{result ? statusTitle(result.status) : "Analysis unavailable"}</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Stain detection and care guidance are suggestions only.</Text>
        {result ? <Text style={[styles.status, { color: theme.textMuted }]}>Status: {result.status}</Text> : null}

        <Card style={[styles.notice, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <MaterialIcons name="info-outline" size={22} color={theme.warning} />
          <Text style={[styles.noticeTitle, { color: theme.text }]}>Check the care label first</Text>
          <Text style={[styles.noticeCopy, { color: theme.textMuted }]}>Care-label instructions are more authoritative than AI image analysis.</Text>
        </Card>

        {!result ? (
          <Card style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Result unavailable</Text>
            <Text style={[styles.copy, { color: theme.textMuted }]}>Try another photo or continue with Manual Booking.</Text>
          </Card>
        ) : (
          <>
            <Card style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Detected stain</Text>
              <Text style={[styles.primaryResult, { color: result.stain === null ? theme.success : theme.primary }]}>{stainName(result.stain)}</Text>
              {result.confidence !== null ? <Text style={[styles.copy, { color: theme.textMuted }]}>Confidence: {Math.round(result.confidence * 100)}% (advisory)</Text> : null}
              {result.stain === "blood" ? <Text style={[styles.bloodNotice, { color: theme.warning }]}>Possible blood-like stain. This is visual guidance only; use appropriate hygiene precautions.</Text> : null}
            </Card>

            <Card style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Advisory care guidance</Text>
              {result.careGuidance.cleaningRecommendation ? <Text style={[styles.guidance, { color: theme.textMuted }]}>Cleaning: {result.careGuidance.cleaningRecommendation}</Text> : null}
              {result.careGuidance.specialTreatment ? <Text style={[styles.guidance, { color: theme.textMuted }]}>Special treatment: {result.careGuidance.specialTreatment}</Text> : null}
              {result.careGuidance.serviceRecommendation ? <Text style={[styles.guidance, { color: theme.textMuted }]}>Suggested service: {serviceName(result.careGuidance.serviceRecommendation)}</Text> : null}
              {!result.careGuidance.cleaningRecommendation && !result.careGuidance.specialTreatment && !result.careGuidance.serviceRecommendation ? <Text style={[styles.copy, { color: theme.textMuted }]}>No stain-specific guidance was available.</Text> : null}
            </Card>

            {result.careGuidance.safetyNotes.length > 0 ? (
              <Card style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Safety and care notes</Text>
                {result.careGuidance.safetyNotes.map((note, index) => <Text key={`${note}-${index}`} style={[styles.note, { color: theme.textMuted }]}>• {note}</Text>)}
              </Card>
            ) : null}

            {result.warnings.length > 0 ? (
              <Card style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Review notes</Text>
                {result.warnings.map((warning, index) => <Text key={`${warning}-${index}`} style={[styles.note, { color: theme.textMuted }]}>• {warning}</Text>)}
              </Card>
            ) : null}
          </>
        )}

        <TouchableOpacity accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={() => router.replace("/stain-scan" as never)}>
          <Text style={styles.primaryButtonText}>Try Another Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={[styles.secondaryButton, { borderColor: theme.border }]} onPress={() => router.push("/select-service")}>
          <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Continue with Manual Booking</Text>
        </TouchableOpacity>
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
  status: { marginTop: 6, fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
  notice: { marginTop: 22, alignItems: "center" },
  noticeTitle: { marginTop: 8, fontSize: 16, fontWeight: "700" },
  noticeCopy: { marginTop: 6, fontSize: 14, lineHeight: 20, textAlign: "center" },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  primaryResult: { marginTop: 10, fontSize: 22, fontWeight: "700" },
  copy: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  guidance: { marginTop: 9, fontSize: 14, lineHeight: 20 },
  note: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  bloodNotice: { marginTop: 10, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  primaryButton: { minHeight: 54, marginTop: 28, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondaryButton: { minHeight: 52, marginTop: 12, borderWidth: 1, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { fontSize: 15, fontWeight: "600" },
});
