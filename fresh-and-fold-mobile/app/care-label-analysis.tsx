import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "../components/Card";
import { useAppTheme } from "../hooks/useAppTheme";
import type { CareLabelAnalysisResult, CareLabelCategory, CareLabelReadingStatus, CareSymbol } from "../types/ai";
import { careLabelCategoryLabel, careSymbolLabel } from "../utils/careLabelPresentation";

const categoryOrder: CareLabelCategory[] = ["washing", "bleaching", "drying", "ironing", "dry_cleaning"];
const categorySet = new Set<CareLabelCategory>(categoryOrder);
const readingStatusSet = new Set<CareLabelReadingStatus>(["recognized", "uncertain", "unreadable", "not_shown"]);
const symbolSet = new Set<CareSymbol>([
  "wash", "do_not_wash", "hand_wash", "bleach_allowed", "non_chlorine_bleach_only", "do_not_bleach", "tumble_dry", "do_not_tumble_dry", "line_dry", "dry_flat", "iron", "do_not_iron", "dry_clean", "do_not_dry_clean",
]);

const statusTitle = (status: CareLabelAnalysisResult["status"]) => {
  if (status === "partial") return "Partial label reading";
  if (status === "no_match") return "No care label found";
  if (status === "unreadable") return "Label needs another try";
  return "Care label reading";
};

const parseResult = (value: string | string[] | undefined): CareLabelAnalysisResult | null => {
  if (typeof value !== "string") return null;
  try {
    const result = JSON.parse(value) as CareLabelAnalysisResult;
    const readingsAreValid = Array.isArray(result.readings) && result.readings.length === categoryOrder.length && result.readings.every((reading, index) =>
      reading && reading.category === categoryOrder[index] && categorySet.has(reading.category) && readingStatusSet.has(reading.status) &&
      (reading.observedSymbol === null || symbolSet.has(reading.observedSymbol)) &&
      (reading.observedText === null || typeof reading.observedText === "string") &&
      (reading.interpretation === null || typeof reading.interpretation === "string") &&
      (reading.confidence === null || (typeof reading.confidence === "number" && reading.confidence >= 0 && reading.confidence <= 1))
    );
    const hasValidStatus = ["complete", "partial", "no_match", "unreadable"].includes(result.status);
    const hasValidTopLevelFields =
      (result.extractedText === null || typeof result.extractedText === "string") &&
      Array.isArray(result.unreadableRegions) && result.unreadableRegions.every((region) => typeof region === "string") &&
      Array.isArray(result.warnings) && result.warnings.every((warning) => typeof warning === "string") &&
      typeof result.requestId === "string" && result.requiresUserReview === true;

    if (!hasValidStatus || !hasValidTopLevelFields || !readingsAreValid) return null;
    return result;
  } catch {
    return null;
  }
};

export default function CareLabelAnalysisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { result: resultParam } = useLocalSearchParams<{ result?: string }>();
  const result = parseResult(resultParam);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 18 }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <TouchableOpacity accessibilityRole="button" style={styles.back} onPress={() => router.replace("/care-label-scan" as never)}>
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Care Label Reader</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>{result ? statusTitle(result.status) : "Analysis unavailable"}</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Care-label results are advisory. The physical label remains the source of truth.</Text>
        {result ? <Text style={[styles.status, { color: theme.textMuted }]}>Status: {result.status}</Text> : null}

        <Card style={[styles.notice, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <MaterialIcons name="info-outline" size={22} color={theme.warning} />
          <Text style={[styles.noticeTitle, { color: theme.text }]}>Check the physical label first</Text>
          <Text style={[styles.noticeCopy, { color: theme.textMuted }]}>Only visible text and symbols can be interpreted. Missing or unclear details are not guessed.</Text>
        </Card>

        {!result ? (
          <Card style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Result unavailable</Text>
            <Text style={[styles.copy, { color: theme.textMuted }]}>Try another photo or continue with Manual Booking.</Text>
          </Card>
        ) : (
          <>
            {result.extractedText ? (
              <Card style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Text read from label</Text>
                <Text style={[styles.copy, { color: theme.textMuted }]}>This visible text may be incomplete. Compare it with the physical label.</Text>
                <Text style={[styles.observedText, { color: theme.text }]}>{result.extractedText}</Text>
              </Card>
            ) : null}

            <Card style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Care instructions</Text>
              {result.readings.map((reading) => (
                <View key={reading.category} style={styles.reading}>
                  <Text style={[styles.readingTitle, { color: theme.text }]}>{careLabelCategoryLabel(reading.category)}</Text>
                  {reading.status === "recognized" ? (
                    <>
                      {reading.observedSymbol ? <Text style={[styles.copy, { color: theme.textMuted }]}>Observed symbol: {careSymbolLabel(reading.observedSymbol)}</Text> : null}
                      {reading.observedText ? <Text style={[styles.copy, { color: theme.textMuted }]}>Observed text: {reading.observedText}</Text> : null}
                      <Text style={[styles.interpretation, { color: theme.primary }]}>{reading.interpretation}</Text>
                      {reading.confidence !== null ? <Text style={[styles.copy, { color: theme.textMuted }]}>Confidence: {Math.round(reading.confidence * 100)}% (advisory)</Text> : null}
                    </>
                  ) : reading.status === "not_shown" ? (
                    <Text style={[styles.copy, { color: theme.textMuted }]}>No instruction was identified for this category.</Text>
                  ) : (
                    <>
                      {reading.observedText ? <Text style={[styles.copy, { color: theme.textMuted }]}>Partly observed text: {reading.observedText}</Text> : null}
                      <Text style={[styles.copy, { color: theme.textMuted }]}>{reading.status === "unreadable" ? "This part of the label could not be read." : "This instruction is uncertain and is not interpreted."}</Text>
                    </>
                  )}
                </View>
              ))}
            </Card>

            {result.unreadableRegions.length > 0 ? (
              <Card style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Unreadable regions</Text>
                {result.unreadableRegions.map((region, index) => <Text key={`${region}-${index}`} style={[styles.note, { color: theme.textMuted }]}>• {region}</Text>)}
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

        <TouchableOpacity accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={() => router.replace("/care-label-scan" as never)}><Text style={styles.primaryButtonText}>Try Another Photo</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={[styles.secondaryButton, { borderColor: theme.border }]} onPress={() => router.push("/select-service")}><Text style={[styles.secondaryButtonText, { color: theme.text }]}>Continue with Manual Booking</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: 20 }, back: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", minHeight: 40 }, backText: { marginLeft: 6, fontSize: 15, fontWeight: "600" },
  title: { marginTop: 18, fontSize: 30, fontWeight: "700" }, subtitle: { marginTop: 8, fontSize: 15, lineHeight: 22 }, status: { marginTop: 6, fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
  notice: { marginTop: 22, alignItems: "center" }, noticeTitle: { marginTop: 8, fontSize: 16, fontWeight: "700" }, noticeCopy: { marginTop: 6, fontSize: 14, lineHeight: 20, textAlign: "center" },
  section: { marginTop: 16 }, sectionTitle: { fontSize: 16, fontWeight: "700" }, copy: { marginTop: 8, fontSize: 14, lineHeight: 20 }, observedText: { marginTop: 10, fontSize: 15, lineHeight: 22, fontWeight: "600" },
  reading: { marginTop: 16 }, readingTitle: { fontSize: 15, fontWeight: "700" }, interpretation: { marginTop: 8, fontSize: 15, lineHeight: 21, fontWeight: "600" }, note: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  primaryButton: { minHeight: 54, marginTop: 28, borderRadius: 16, alignItems: "center", justifyContent: "center" }, primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondaryButton: { minHeight: 52, marginTop: 12, borderWidth: 1, borderRadius: 16, alignItems: "center", justifyContent: "center" }, secondaryButtonText: { fontSize: 15, fontWeight: "600" },
});
