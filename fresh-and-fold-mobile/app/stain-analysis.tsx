import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { type ComponentProps, type ReactNode, useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../hooks/useAppTheme";
import { homeDesign } from "../theme/theme";
import type { StainAnalysisResult, StainType } from "../types/ai";
import { ambiguousStainDisclaimer, formatStainLabel } from "../utils/stainPresentation";

const validStainTypes = new Set<StainType>([
  "coffee", "tea", "blood", "oil", "ink", "mud", "wine", "grass", "sweat", "tomato_sauce", "makeup", "unknown",
]);

const knownStainTypes = new Set<Exclude<StainType, "unknown">>([
  "coffee", "tea", "blood", "oil", "ink", "mud", "wine", "grass", "sweat", "tomato_sauce", "makeup",
]);

const validAnalysisStatuses = new Set<StainAnalysisResult["status"]>(["complete", "partial", "no_match", "unreadable"]);

type CareItem = {
  label: string;
  value: string;
  icon: ComponentProps<typeof MaterialIcons>["name"];
};

const serviceName = (service: "wash" | "dry" | "express") => {
  if (service === "dry") return "Dry Cleaning";
  if (service === "express") return "Express Service";
  return "Wash & Fold";
};

const statusPresentation = (status: StainAnalysisResult["status"]) => {
  if (status === "partial") return { title: "Partial analysis", icon: "info-outline" as const };
  if (status === "no_match") return { title: "No stain found", icon: "check-circle-outline" as const };
  if (status === "unreadable") return { title: "Image needs another try", icon: "photo-size-select-small" as const };
  return { title: "Analysis complete", icon: "check-circle" as const };
};

const parseResult = (value: string | string[] | undefined): StainAnalysisResult | null => {
  if (typeof value !== "string") return null;

  try {
    const result = JSON.parse(value) as StainAnalysisResult;
    const guidance = result.careGuidance;
    const hasValidStatus = validAnalysisStatuses.has(result.status);
    const hasValidStain = result.stain === null || validStainTypes.has(result.stain);
    const hasValidConfidence = result.confidence === null || (typeof result.confidence === "number" && result.confidence >= 0 && result.confidence <= 1);
    const hasValidCandidates = Array.isArray(result.candidates)
      && result.candidates.length <= 3
      && result.candidates.every((candidate) => candidate && knownStainTypes.has(candidate.stain) && typeof candidate.confidence === "number" && candidate.confidence >= 0 && candidate.confidence <= 1);
    const hasValidGuidance = guidance
      && typeof guidance === "object"
      && (typeof guidance.cleaningRecommendation === "string" || guidance.cleaningRecommendation === null)
      && (typeof guidance.specialTreatment === "string" || guidance.specialTreatment === null)
      && Array.isArray(guidance.safetyNotes)
      && guidance.safetyNotes.every((note) => typeof note === "string")
      && ["wash", "dry", "express", null].includes(guidance.serviceRecommendation);
    const candidateStains = Array.isArray(result.candidates) ? result.candidates.map((candidate) => candidate.stain) : [];
    const candidatesAreDistinct = new Set(candidateStains).size === candidateStains.length;
    const candidatesAreSorted = Array.isArray(result.candidates) && result.candidates.every((candidate, index, candidates) => {
      const previous = candidates[index - 1];
      return !previous || previous.confidence > candidate.confidence || (previous.confidence === candidate.confidence && previous.stain.localeCompare(candidate.stain, "en-US") <= 0);
    });

    if (!hasValidStatus || !hasValidStain || !hasValidConfidence || !hasValidCandidates || !hasValidGuidance || !Array.isArray(result.warnings) || !candidatesAreDistinct || !candidatesAreSorted) return null;

    if (
      (result.status === "no_match" && (result.stain !== null || result.confidence !== null || result.candidates.length !== 0))
      || (result.status === "unreadable" && (result.stain !== "unknown" || result.confidence !== null || result.candidates.length !== 0))
      || (result.stain === null && result.status !== "no_match")
      || (result.stain === "unknown" && ((result.status !== "unreadable" && result.status !== "partial") || result.confidence !== null || result.candidates.length === 1))
      || (result.stain !== null && result.stain !== "unknown" && (result.confidence === null || result.candidates.length !== 0))
    ) return null;

    return result;
  } catch {
    return null;
  }
};

function Surface({ children, style }: { children: ReactNode; style?: object }) {
  const { theme } = useAppTheme();
  return <View style={[styles.surface, { backgroundColor: theme.aiCareCardGlass, borderColor: theme.aiCareGlassBorder }, style]}>
    <View pointerEvents="none" style={[styles.glassHighlight, { backgroundColor: theme.aiCareGlassHighlight }]} />
    {children}
  </View>;
}

export default function StainAnalysisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { result: resultParam } = useLocalSearchParams<{ result?: string }>();
  const result = useMemo(() => parseResult(resultParam), [resultParam]);
  const possibleCandidates = result?.stain === "unknown" ? result.candidates : [];
  const careItems = useMemo<CareItem[]>(() => {
    if (!result) return [];
    const items: CareItem[] = [];
    if (result.careGuidance.cleaningRecommendation) items.push({ label: "Cleaning guidance", value: result.careGuidance.cleaningRecommendation, icon: "cleaning-services" });
    if (result.careGuidance.specialTreatment) items.push({ label: "Special treatment", value: result.careGuidance.specialTreatment, icon: "science" });
    if (result.careGuidance.serviceRecommendation) items.push({ label: "Suggested service", value: serviceName(result.careGuidance.serviceRecommendation), icon: "local-laundry-service" });
    return items;
  }, [result]);
  const status = result ? statusPresentation(result.status) : null;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to Stain Detection" accessibilityHint="Returns to the Stain Detection screen." hitSlop={8} onPress={() => router.replace("/stain-scan" as never)} style={[styles.backButton, { backgroundColor: theme.headerButtonBg, borderColor: theme.headerButtonBorder }]}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text maxFontSizeMultiplier={1.15} style={[styles.title, { color: theme.text }]}>Stain Analysis</Text>
            <Text maxFontSizeMultiplier={1.2} style={[styles.subtitle, { color: theme.textMuted }]}>AI-powered fabric care insights</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {!result ? (
          <Surface style={styles.unavailableCard}>
            <MaterialIcons name="info-outline" size={24} color={theme.warning} />
            <Text maxFontSizeMultiplier={1.2} style={[styles.unavailableTitle, { color: theme.text }]}>Analysis unavailable</Text>
            <Text maxFontSizeMultiplier={1.25} style={[styles.unavailableCopy, { color: theme.textMuted }]}>The result could not be validated. Try another photo or continue with Manual Booking.</Text>
          </Surface>
        ) : (
          <>
            <View style={[styles.statusRow, { backgroundColor: result.status === "complete" || result.status === "no_match" ? theme.successSoft : theme.surfaceAlt, borderColor: theme.aiCareGlassBorder }]}>
              <MaterialIcons name={status!.icon} size={18} color={result.status === "complete" || result.status === "no_match" ? theme.success : theme.warning} />
              <Text maxFontSizeMultiplier={1.2} style={[styles.statusText, { color: result.status === "complete" || result.status === "no_match" ? theme.success : theme.warning }]}>{status!.title}</Text>
            </View>

            <Surface style={styles.resultCard}>
              <View style={styles.resultHeading}>
                <View style={[styles.resultIcon, { backgroundColor: result.stain === null ? theme.successSoft : theme.primarySoft, borderColor: theme.aiCareGlassBorder }]}>
                  <MaterialIcons name={result.stain === null ? "check" : result.stain === "unknown" ? "help-outline" : "water-drop"} size={29} color={result.stain === null ? theme.success : theme.primary} />
                </View>
                <View style={styles.resultHeadingCopy}>
                  <Text maxFontSizeMultiplier={1.2} style={[styles.eyebrow, { color: theme.textMuted }]}>{possibleCandidates.length > 0 ? "POSSIBLE STAIN TYPES" : "DETECTED STAIN"}</Text>
                  <Text maxFontSizeMultiplier={1.15} style={[styles.resultTitle, { color: theme.text }]}>{possibleCandidates.length > 0 ? "Stain type uncertain" : formatStainLabel(result.stain)}</Text>
                </View>
              </View>

              {possibleCandidates.length > 0 ? (
                <>
                  <Text maxFontSizeMultiplier={1.25} style={[styles.uncertainCopy, { color: theme.textMuted }]}>{ambiguousStainDisclaimer}</Text>
                  <View style={styles.candidateList}>
                    {possibleCandidates.map((candidate) => (
                      <View key={candidate.stain} style={[styles.candidateRow, { borderColor: theme.aiCareGlassBorder }]}>
                        <Text maxFontSizeMultiplier={1.2} style={[styles.candidateName, { color: theme.text }]}>{formatStainLabel(candidate.stain)}</Text>
                        <Text maxFontSizeMultiplier={1.2} style={[styles.candidateConfidence, { color: theme.primary }]}>{Math.round(candidate.confidence * 100)}% advisory</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  {result.confidence !== null ? (
                    <View style={styles.confidenceWrap}>
                      <Text maxFontSizeMultiplier={1.2} style={[styles.confidenceText, { color: theme.textMuted }]}>Confidence <Text style={{ color: theme.success }}>{Math.round(result.confidence * 100)}%</Text> · Advisory only</Text>
                      <View style={[styles.confidenceTrack, { backgroundColor: theme.surfaceAlt }]}><View style={[styles.confidenceFill, { width: `${Math.max(4, Math.min(100, Math.round(result.confidence * 100)))}%`, backgroundColor: theme.success }]} /></View>
                    </View>
                  ) : null}
                  {result.status === "unreadable" ? <Text maxFontSizeMultiplier={1.25} style={[styles.uncertainCopy, { color: theme.textMuted }]}>We could not reliably read the stained area from this photo. Try a clearer image.</Text> : null}
                </>
              )}
              {result.stain === "blood" ? <Text maxFontSizeMultiplier={1.2} style={[styles.bloodNotice, { color: theme.warning }]}>This is visual guidance only; use appropriate hygiene precautions.</Text> : null}
            </Surface>

            {careItems.length > 0 ? (
              <Surface style={styles.careCard}>
                <View style={styles.sectionHeading}><MaterialIcons name="science" size={20} color={theme.primary} /><Text maxFontSizeMultiplier={1.2} style={[styles.sectionTitle, { color: theme.text }]}>Recommended Care</Text></View>
                <Text maxFontSizeMultiplier={1.25} style={[styles.sectionIntro, { color: theme.textMuted }]}>Use this guidance alongside the garment’s care label.</Text>
                <View style={styles.careList}>
                  {careItems.map((item, index) => (
                    <View key={item.label} style={[styles.careItem, index > 0 && { borderTopColor: theme.aiCareGlassBorder, borderTopWidth: StyleSheet.hairlineWidth }]}>
                      <View style={[styles.careNumber, { backgroundColor: theme.primary }]}><Text style={styles.careNumberText}>{index + 1}</Text></View>
                      <View style={styles.careCopyWrap}>
                        <Text maxFontSizeMultiplier={1.2} style={[styles.careLabel, { color: theme.text }]}>{item.label}</Text>
                        <Text maxFontSizeMultiplier={1.25} style={[styles.careValue, { color: theme.textMuted }]}>{item.value}</Text>
                      </View>
                      <View style={[styles.careItemIcon, { backgroundColor: theme.primarySoft }]}><MaterialIcons name={item.icon} size={21} color={theme.primary} /></View>
                    </View>
                  ))}
                </View>
              </Surface>
            ) : (
              <Surface style={styles.noGuidanceCard}>
                <Text maxFontSizeMultiplier={1.2} style={[styles.sectionTitle, { color: theme.text }]}>Recommended Care</Text>
                <Text maxFontSizeMultiplier={1.25} style={[styles.sectionIntro, { color: theme.textMuted }]}>No stain-specific guidance was available for this result.</Text>
              </Surface>
            )}

            {result.careGuidance.safetyNotes.length > 0 ? (
              <Surface style={styles.notesCard}>
                <View style={styles.sectionHeading}><MaterialIcons name="verified-user" size={20} color={theme.primary} /><Text maxFontSizeMultiplier={1.2} style={[styles.sectionTitle, { color: theme.text }]}>Safety and Care Notes</Text></View>
                {result.careGuidance.safetyNotes.map((note, index) => <View key={`${note}-${index}`} style={styles.noteRow}><MaterialIcons name="check-circle" size={16} color={theme.success} /><Text maxFontSizeMultiplier={1.2} style={[styles.noteText, { color: theme.textMuted }]}>{note}</Text></View>)}
              </Surface>
            ) : null}

            {result.warnings.length > 0 ? (
              <Surface style={styles.notesCard}>
                <View style={styles.sectionHeading}><MaterialIcons name="info-outline" size={20} color={theme.warning} /><Text maxFontSizeMultiplier={1.2} style={[styles.sectionTitle, { color: theme.text }]}>Review Notes</Text></View>
                {result.warnings.map((warning, index) => <View key={`${warning}-${index}`} style={styles.noteRow}><MaterialIcons name="info-outline" size={16} color={theme.warning} /><Text maxFontSizeMultiplier={1.2} style={[styles.noteText, { color: theme.textMuted }]}>{warning}</Text></View>)}
              </Surface>
            ) : null}
          </>
        )}

        <View style={[styles.safetyCard, { backgroundColor: theme.homeSurfaceElevated, borderColor: theme.aiCareGlassBorder }]}>
          <View style={[styles.safetyIcon, { backgroundColor: theme.primarySoft }]}><MaterialIcons name="info-outline" size={22} color={theme.primary} /></View>
          <View style={styles.safetyCopyWrap}>
            <Text maxFontSizeMultiplier={1.2} style={[styles.safetyTitle, { color: theme.text }]}>Care label first</Text>
            <Text maxFontSizeMultiplier={1.25} style={[styles.safetyCopy, { color: theme.textMuted }]}>Always check the garment care label and test any treatment on a small hidden area first.</Text>
          </View>
        </View>

        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Scan another stain" accessibilityHint="Returns to Stain Detection to choose another image." onPress={() => router.replace("/stain-scan" as never)} style={[styles.primaryButton, { backgroundColor: theme.primary, borderColor: theme.headerButtonBorder }]}>
          <MaterialIcons name="photo-camera" size={21} color="#FFFFFF" />
          <Text maxFontSizeMultiplier={1.2} style={styles.primaryButtonText}>Scan Another Stain</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Continue with Manual Booking" accessibilityHint="Starts booking without using this analysis." onPress={() => router.push("/select-service")} style={[styles.secondaryButton, { borderColor: theme.aiCareGlassBorder, backgroundColor: theme.homeSurfaceElevated }]}>
          <Text maxFontSizeMultiplier={1.2} style={[styles.secondaryButtonText, { color: theme.text }]}>Continue with Manual Booking</Text>
          <MaterialIcons name="arrow-forward" size={18} color={theme.textMuted} />
        </TouchableOpacity>
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
  subtitle: { marginTop: 3, fontSize: 13, lineHeight: 18, textAlign: "center" },
  surface: { position: "relative", marginTop: 14, overflow: "hidden", borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 15 },
  glassHighlight: { position: "absolute", top: 0, left: 16, right: 16, height: 1, borderRadius: 1 },
  unavailableCard: { minHeight: 154, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  unavailableTitle: { marginTop: 9, fontSize: 18, lineHeight: 23, fontWeight: "700" },
  unavailableCopy: { marginTop: 6, fontSize: 13, lineHeight: 19, textAlign: "center" },
  statusRow: { alignSelf: "center", minHeight: 34, marginTop: 16, borderRadius: 17, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row", alignItems: "center" },
  statusText: { marginLeft: 6, fontSize: 12.5, fontWeight: "700" },
  resultCard: { marginTop: 14 },
  resultHeading: { flexDirection: "row", alignItems: "center" },
  resultIcon: { width: 62, height: 62, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  resultHeadingCopy: { flex: 1, marginLeft: 12 },
  eyebrow: { fontSize: 10, lineHeight: 14, fontWeight: "700", letterSpacing: 0.7 },
  resultTitle: { marginTop: 3, fontSize: 23, lineHeight: 29, fontWeight: "700", letterSpacing: -0.45 },
  confidenceWrap: { marginTop: 14 },
  confidenceText: { fontSize: 13, lineHeight: 18 },
  confidenceTrack: { height: 5, marginTop: 7, borderRadius: 3, overflow: "hidden" },
  confidenceFill: { height: "100%", borderRadius: 3 },
  uncertainCopy: { marginTop: 14, fontSize: 13, lineHeight: 19 },
  candidateList: { marginTop: 12, gap: 8 },
  candidateRow: { minHeight: 44, borderRadius: 13, borderWidth: 1, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  candidateName: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  candidateConfidence: { marginLeft: 8, fontSize: 11.5, fontWeight: "700" },
  bloodNotice: { marginTop: 12, fontSize: 12.5, lineHeight: 18, fontWeight: "600" },
  careCard: { marginTop: 14 },
  noGuidanceCard: { marginTop: 14 },
  sectionHeading: { flexDirection: "row", alignItems: "center" },
  sectionTitle: { marginLeft: 8, fontSize: 17, lineHeight: 22, fontWeight: "700", letterSpacing: -0.28 },
  sectionIntro: { marginTop: 6, fontSize: 12.5, lineHeight: 18 },
  careList: { marginTop: 13 },
  careItem: { minHeight: 72, paddingVertical: 10, flexDirection: "row", alignItems: "center" },
  careNumber: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  careNumberText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  careCopyWrap: { flex: 1, marginLeft: 10, paddingRight: 8 },
  careLabel: { fontSize: 13.5, lineHeight: 18, fontWeight: "700" },
  careValue: { marginTop: 2, fontSize: 12.5, lineHeight: 18 },
  careItemIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  notesCard: { marginTop: 14 },
  noteRow: { marginTop: 10, flexDirection: "row", alignItems: "flex-start" },
  noteText: { flex: 1, marginLeft: 8, fontSize: 12.5, lineHeight: 18 },
  safetyCard: { minHeight: 90, marginTop: 14, borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center" },
  safetyIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  safetyCopyWrap: { flex: 1, marginLeft: 12 },
  safetyTitle: { fontSize: 16, lineHeight: 21, fontWeight: "700" },
  safetyCopy: { marginTop: 3, fontSize: 12.5, lineHeight: 18 },
  primaryButton: { minHeight: 56, marginTop: 18, borderRadius: 18, borderWidth: 1, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", shadowColor: "#2563EB", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  primaryButtonText: { marginLeft: 9, color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondaryButton: { minHeight: 52, marginTop: 10, borderRadius: 17, borderWidth: 1, paddingHorizontal: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  secondaryButtonText: { fontSize: 14, fontWeight: "700" },
});
