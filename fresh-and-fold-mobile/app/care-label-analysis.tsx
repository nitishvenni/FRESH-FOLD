import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../hooks/useAppTheme";
import type { CareLabelAnalysisResult, CareLabelCategory, CareLabelReadingStatus, CareSymbol } from "../types/ai";
import { careLabelCategoryLabel } from "../utils/careLabelPresentation";

const categoryOrder: CareLabelCategory[] = ["washing", "bleaching", "drying", "ironing", "dry_cleaning"];
const categorySet = new Set<CareLabelCategory>(categoryOrder);
const readingStatusSet = new Set<CareLabelReadingStatus>(["recognized", "uncertain", "unreadable", "not_shown"]);
const symbolSet = new Set<CareSymbol>([
  "wash", "do_not_wash", "hand_wash", "bleach_allowed", "non_chlorine_bleach_only", "do_not_bleach", "tumble_dry", "do_not_tumble_dry", "line_dry", "dry_flat", "iron", "do_not_iron", "dry_clean", "do_not_dry_clean",
]);

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

const categoryIcon = (category: CareLabelCategory) => {
  switch (category) {
    case "washing": return "washing-machine";
    case "bleaching": return "triangle-outline";
    case "drying": return "tumble-dryer";
    case "ironing": return "iron";
    case "dry_cleaning": return "hanger";
  }
};

type SemanticStatus = "do" | "dont" | "caution" | null;

const symbolSemanticStatus = (symbol: CareSymbol | null): SemanticStatus => {
  if (!symbol) return null;
  switch (symbol) {
    case "wash":
    case "hand_wash":
    case "bleach_allowed":
    case "tumble_dry":
    case "line_dry":
    case "dry_flat":
    case "iron":
    case "dry_clean":
      return "do";
    case "do_not_wash":
    case "do_not_bleach":
    case "do_not_tumble_dry":
    case "do_not_iron":
    case "do_not_dry_clean":
      return "dont";
    case "non_chlorine_bleach_only":
      return "caution";
    default:
      return null;
  }
};

export default function CareLabelAnalysisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { result: resultParam, imageUri: imageUriParam } = useLocalSearchParams<{ result?: string; imageUri?: string }>();
  
  const result = parseResult(resultParam);
  const imageUri = typeof imageUriParam === "string" ? imageUriParam : null;

  const glassBg = isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.7)";
  const glassBorder = isDark ? "rgba(148, 163, 184, 0.15)" : "rgba(148, 163, 184, 0.2)";
  const iconBg = isDark ? "rgba(37, 99, 235, 0.15)" : "rgba(37, 99, 235, 0.08)";
  const primaryIconBg = isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)";

  const displayedReadings = result?.readings.filter((r) => r.status !== "not_shown") ?? [];

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" style={styles.backButton} onPress={() => router.replace("/care-label-scan" as never)}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Care Label Analysis</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          AI-powered care instructions
        </Text>

        {result ? (
          <View style={[styles.statusBadge, { backgroundColor: primaryIconBg, borderColor: isDark ? "rgba(16, 185, 129, 0.3)" : "rgba(16, 185, 129, 0.2)" }]}>
            <MaterialIcons name="check-circle" size={16} color={isDark ? "#34D399" : "#059669"} />
            <Text style={[styles.statusBadgeText, { color: isDark ? "#34D399" : "#059669" }]}>Analysis Complete</Text>
          </View>
        ) : null}

        {!result ? (
          <View style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder, marginTop: 24, alignItems: "center" }]}>
            <MaterialIcons name="error-outline" size={32} color={theme.warning} style={{ marginBottom: 12 }} />
            <Text style={[styles.cardTitle, { color: theme.text, textAlign: "center" }]}>Result unavailable</Text>
            <Text style={[styles.copy, { color: theme.textMuted, textAlign: "center" }]}>Try another photo or continue with Manual Booking.</Text>
          </View>
        ) : (
          <View style={{ gap: 20 }}>
            {imageUri ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Scanned Care Label</Text>
                <View style={[styles.previewContainer, { backgroundColor: glassBg, borderColor: glassBorder }]}>
                  <Image accessibilityLabel="Scanned care label" source={{ uri: imageUri }} style={[styles.previewImage, { borderColor: glassBorder }]} />
                </View>
              </View>
            ) : null}

            {result.extractedText && result.extractedText.trim().length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Text read from label</Text>
                <View style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder }]}>
                  <Text style={[styles.extractedText, { color: theme.text }]}>{result.extractedText}</Text>
                </View>
              </View>
            ) : null}

            {displayedReadings.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Care Instructions</Text>
                <View style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder, gap: 16 }]}>
                  {displayedReadings.map((reading) => {
                    const semantic = symbolSemanticStatus(reading.observedSymbol);
                    let badgeBg = "transparent";
                    let badgeColor = "transparent";
                    let badgeBorder = "transparent";
                    let badgeText = "";

                    if (semantic === "do") {
                      badgeText = "Do";
                      badgeBg = isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)";
                      badgeColor = isDark ? "#34D399" : "#059669";
                      badgeBorder = isDark ? "rgba(16, 185, 129, 0.3)" : "rgba(16, 185, 129, 0.2)";
                    } else if (semantic === "dont") {
                      badgeText = "Don't";
                      badgeBg = isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)";
                      badgeColor = isDark ? "#F87171" : "#DC2626";
                      badgeBorder = isDark ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.2)";
                    } else if (semantic === "caution") {
                      badgeText = "Use Caution";
                      badgeBg = isDark ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.1)";
                      badgeColor = isDark ? "#FBBF24" : "#D97706";
                      badgeBorder = isDark ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.2)";
                    }

                    return (
                      <View key={reading.category} style={styles.careRow}>
                        <View style={[styles.careIconBox, { backgroundColor: iconBg }]}>
                          <MaterialCommunityIcons name={categoryIcon(reading.category)} size={20} color={semantic === "dont" ? badgeColor : theme.primary} />
                        </View>
                        <View style={styles.careContent}>
                          <View style={styles.careTitleRow}>
                            <Text style={[styles.careTitle, { color: semantic === "dont" ? badgeColor : theme.text }]}>
                              {careLabelCategoryLabel(reading.category)}
                            </Text>
                            {semantic ? (
                              <View style={[styles.semanticBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
                                <Text style={[styles.semanticBadgeText, { color: badgeColor }]}>{badgeText}</Text>
                              </View>
                            ) : null}
                          </View>
                          
                          {reading.status === "recognized" ? (
                            <Text style={[styles.careDescription, { color: theme.textMuted }]}>{reading.interpretation}</Text>
                          ) : reading.status === "uncertain" ? (
                            <View style={[styles.uncertainBox, { backgroundColor: isDark ? "rgba(245, 158, 11, 0.1)" : "rgba(245, 158, 11, 0.05)" }]}>
                              <MaterialIcons name="help-outline" size={16} color={isDark ? "#FBBF24" : "#D97706"} />
                              <Text style={[styles.careDescription, { color: isDark ? "#FBBF24" : "#D97706", flex: 1 }]}>
                                {reading.interpretation ? `${reading.interpretation} (Uncertain)` : "This instruction is uncertain."}
                              </Text>
                            </View>
                          ) : (
                            <Text style={[styles.careDescription, { color: theme.textMuted, fontStyle: "italic" }]}>Could not clearly read this care symbol.</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {result.warnings.length > 0 || result.unreadableRegions.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Care Notes</Text>
                <View style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder, gap: 12 }]}>
                  {result.unreadableRegions.map((region, index) => (
                    <View key={`region-${index}`} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                      <MaterialIcons name="visibility-off" size={18} color={theme.warning} style={{ marginTop: 2 }} />
                      <Text style={[styles.warningText, { color: theme.text, flex: 1 }]}>Unreadable: {region}</Text>
                    </View>
                  ))}
                  {result.warnings.map((warning, index) => (
                    <View key={`warning-${index}`} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                      <MaterialIcons name="info" size={18} color={theme.warning} style={{ marginTop: 2 }} />
                      <Text style={[styles.warningText, { color: theme.text, flex: 1 }]}>{warning}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={[styles.card, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.05)", borderColor: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.15)" }]}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <MaterialCommunityIcons name="shield-check" size={24} color={isDark ? "#60A5FA" : "#3B82F6"} />
                <Text style={[styles.safetyText, { color: theme.textMuted }]}>
                  Always check the garment's physical care label before washing or treating the fabric. Only visible text and symbols can be interpreted.
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={() => router.push("/select-service")}>
            <MaterialIcons name="shopping-bag" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>Proceed to Booking</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={[styles.secondaryButton, { borderColor: glassBorder, backgroundColor: glassBg }]} onPress={() => router.replace("/care-label-scan" as never)}>
            <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Scan Another Label</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, height: 56 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  subtitle: { fontSize: 14, textAlign: "center", marginBottom: 16, paddingHorizontal: 16 },
  
  statusBadge: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  statusBadgeText: { fontSize: 13, fontWeight: "600" },

  section: { marginBottom: 0 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12, marginLeft: 4 },
  
  card: { borderRadius: 20, padding: 20, borderWidth: 1 },
  cardTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  copy: { fontSize: 14, lineHeight: 20 },

  previewContainer: { padding: 6, borderRadius: 24, borderWidth: 1 },
  previewImage: { width: "100%", height: 160, borderRadius: 18, borderWidth: 1, resizeMode: "cover" },

  extractedText: { fontSize: 15, lineHeight: 22, fontWeight: "500" },

  careRow: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  careIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  careContent: { flex: 1, paddingTop: 2 },
  careTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  careTitle: { fontSize: 16, fontWeight: "600" },
  semanticBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  semanticBadgeText: { fontSize: 11, fontWeight: "700" },
  careDescription: { fontSize: 14, lineHeight: 20 },
  uncertainBox: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 4, padding: 8, borderRadius: 8 },

  warningText: { fontSize: 14, lineHeight: 20 },

  safetyText: { fontSize: 13, lineHeight: 20, flex: 1 },

  actionsContainer: { marginTop: 32, gap: 12 },
  primaryButton: { minHeight: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondaryButton: { minHeight: 54, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { fontSize: 15, fontWeight: "600" },
});
