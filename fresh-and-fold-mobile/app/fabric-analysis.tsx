import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "../components/Card";
import { useAppTheme } from "../hooks/useAppTheme";
import type { FabricIdentificationResult, FabricType } from "../types/ai";

const fabricName = (fabric: FabricType) =>
  fabric === "unknown" ? "Unknown" : fabric === "other" ? "Other fabric" : `${fabric[0].toUpperCase()}${fabric.slice(1)}`;

const serviceName = (service: "wash" | "dry" | "express") => {
  if (service === "dry") return "Dry Cleaning";
  if (service === "express") return "Express Service";
  return "Wash & Fold";
};

const statusTitle = (status: FabricIdentificationResult["status"]) => {
  if (status === "partial") return "Partial analysis";
  if (status === "no_match") return "No fabric found";
  if (status === "unreadable") return "Image needs another try";
  return "Fabric analysis";
};

const parseResult = (value: string | string[] | undefined): FabricIdentificationResult | null => {
  if (typeof value !== "string") return null;
  try {
    const result = JSON.parse(value) as FabricIdentificationResult;
    const guidance = result.careGuidance;
    const hasValidGuidance =
      guidance &&
      typeof guidance === "object" &&
      (typeof guidance.washing === "string" || guidance.washing === null) &&
      (typeof guidance.drying === "string" || guidance.drying === null) &&
      (typeof guidance.ironing === "string" || guidance.ironing === null) &&
      ["wash", "dry", "express", null].includes(guidance.serviceRecommendation);
    const hasValidCandidates =
      Array.isArray(result.candidates) &&
      result.candidates.every(
        (candidate) =>
          candidate &&
          typeof candidate.fabric === "string" &&
          typeof candidate.confidence === "number"
      );

    return hasValidCandidates && Array.isArray(result.warnings) && hasValidGuidance ? result : null;
  } catch {
    return null;
  }
};

export default function FabricAnalysisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { result: resultParam } = useLocalSearchParams<{ result?: string }>();
  const result = parseResult(resultParam);
  const primaryCandidate = result?.candidates[0] ?? null;
  const additionalCandidates = result?.candidates.slice(1) ?? [];

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 18 }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <TouchableOpacity accessibilityRole="button" style={styles.back} onPress={() => router.replace("/fabric-scan" as never)}>
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Fabric Identification</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>{result ? statusTitle(result.status) : "Analysis unavailable"}</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Fabric identification and care guidance are suggestions only.</Text>
        {result ? <Text style={[styles.status, { color: theme.textMuted }]}>Status: {result.status}</Text> : null}

        <Card style={[styles.notice, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <MaterialIcons name="info-outline" size={22} color={theme.warning} />
          <Text style={[styles.noticeTitle, { color: theme.text }]}>Check the care label first</Text>
          <Text style={[styles.noticeCopy, { color: theme.textMuted }]}>The garment’s care label is more authoritative than AI image analysis.</Text>
        </Card>

        {!result ? (
          <Card style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Result unavailable</Text>
            <Text style={[styles.copy, { color: theme.textMuted }]}>Try another photo or continue with Manual Booking.</Text>
          </Card>
        ) : (
          <>
            <Card style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Most likely fabric</Text>
              {primaryCandidate ? (
                <>
                  <Text style={[styles.primaryCandidate, { color: theme.primary }]}>{fabricName(primaryCandidate.fabric)}</Text>
                  <Text style={[styles.copy, { color: theme.textMuted }]}>Confidence: {Math.round(primaryCandidate.confidence * 100)}% (advisory)</Text>
                </>
              ) : (
                <Text style={[styles.copy, { color: theme.textMuted }]}>No reliable fabric candidate was available.</Text>
              )}
            </Card>

            {additionalCandidates.length > 0 ? (
              <Card style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Other plausible fabrics</Text>
                {additionalCandidates.map((candidate) => (
                  <Text key={candidate.fabric} style={[styles.candidate, { color: theme.textMuted }]}>
                    {fabricName(candidate.fabric)} · {Math.round(candidate.confidence * 100)}%
                  </Text>
                ))}
              </Card>
            ) : null}

            <Card style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Advisory care guidance</Text>
              {result.careGuidance.washing ? <Text style={[styles.guidance, { color: theme.textMuted }]}>Washing: {result.careGuidance.washing}</Text> : null}
              {result.careGuidance.drying ? <Text style={[styles.guidance, { color: theme.textMuted }]}>Drying: {result.careGuidance.drying}</Text> : null}
              {result.careGuidance.ironing ? <Text style={[styles.guidance, { color: theme.textMuted }]}>Ironing: {result.careGuidance.ironing}</Text> : null}
              {result.careGuidance.serviceRecommendation ? (
                <Text style={[styles.guidance, { color: theme.textMuted }]}>Suggested service: {serviceName(result.careGuidance.serviceRecommendation)}</Text>
              ) : null}
              {!result.careGuidance.washing && !result.careGuidance.drying && !result.careGuidance.ironing && !result.careGuidance.serviceRecommendation ? (
                <Text style={[styles.copy, { color: theme.textMuted }]}>No fabric-specific guidance was available.</Text>
              ) : null}
            </Card>

            {result.warnings.length > 0 ? (
              <Card style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Review notes</Text>
                {result.warnings.map((warning, index) => (
                  <Text key={`${warning}-${index}`} style={[styles.warning, { color: theme.textMuted }]}>• {warning}</Text>
                ))}
              </Card>
            ) : null}
          </>
        )}

        <TouchableOpacity accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={() => router.replace("/fabric-scan" as never)}>
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
  primaryCandidate: { marginTop: 10, fontSize: 22, fontWeight: "700" },
  copy: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  candidate: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  guidance: { marginTop: 9, fontSize: 14, lineHeight: 20 },
  warning: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  primaryButton: { minHeight: 54, marginTop: 28, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondaryButton: { minHeight: 52, marginTop: 12, borderWidth: 1, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { fontSize: 15, fontWeight: "600" },
});
