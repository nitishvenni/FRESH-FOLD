import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../hooks/useAppTheme";
import type { FabricIdentificationResult, FabricType } from "../types/ai";

const fabricName = (fabric: FabricType) =>
  fabric === "unknown" ? "Unknown" : fabric === "other" ? "Other fabric" : `${fabric[0].toUpperCase()}${fabric.slice(1)}`;

const serviceName = (service: "wash" | "dry" | "express") => {
  if (service === "dry") return "Dry Cleaning";
  if (service === "express") return "Express Service";
  return "Wash & Fold";
};

const serviceIcon = (service: "wash" | "dry" | "express") => {
  if (service === "dry") return "hanger";
  if (service === "express") return "lightning-bolt";
  return "washing-machine";
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
  const { theme, isDark } = useAppTheme();
  const { result: resultParam, imageUri: imageUriParam } = useLocalSearchParams<{ result?: string; imageUri?: string }>();
  
  const result = parseResult(resultParam);
  const imageUri = typeof imageUriParam === "string" ? imageUriParam : null;

  const primaryCandidate = result?.candidates[0] ?? null;
  const additionalCandidates = result?.candidates.slice(1) ?? [];

  const glassBg = isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.7)";
  const glassBorder = isDark ? "rgba(148, 163, 184, 0.15)" : "rgba(148, 163, 184, 0.2)";
  const iconBg = isDark ? "rgba(37, 99, 235, 0.15)" : "rgba(37, 99, 235, 0.08)";
  const primaryIconBg = isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)";

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" style={styles.backButton} onPress={() => router.replace("/fabric-scan" as never)}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Fabric Analysis</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          AI-powered fabric care insights
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
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Fabric Preview</Text>
                <View style={[styles.previewContainer, { backgroundColor: glassBg, borderColor: glassBorder }]}>
                  <Image accessibilityLabel="Original analyzed fabric" source={{ uri: imageUri }} style={[styles.previewImage, { borderColor: glassBorder }]} />
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Identified Fabric</Text>
              <View style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder }]}>
                {primaryCandidate ? (
                  <View style={styles.primaryFabricRow}>
                    <View style={[styles.fabricIconContainer, { backgroundColor: primaryIconBg, borderColor: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.3)" }]}>
                      <MaterialCommunityIcons name="layers-search" size={28} color={isDark ? "#34D399" : "#059669"} />
                    </View>
                    <View style={styles.fabricContent}>
                      <Text style={[styles.primaryFabricName, { color: theme.text }]}>{fabricName(primaryCandidate.fabric)}</Text>
                      <Text style={[styles.confidenceLabel, { color: theme.textMuted }]}>
                        Confidence: <Text style={{ color: isDark ? "#34D399" : "#059669", fontWeight: "600" }}>{Math.round(primaryCandidate.confidence * 100)}%</Text>
                      </Text>
                      <View style={styles.confidenceBarBg}>
                        <View style={[styles.confidenceBarFill, { width: `${Math.min(100, Math.max(0, primaryCandidate.confidence * 100))}%`, backgroundColor: isDark ? "#34D399" : "#059669" }]} />
                      </View>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.copy, { color: theme.textMuted }]}>No reliable fabric candidate was available.</Text>
                )}
              </View>
            </View>

            {additionalCandidates.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Other Possible Matches</Text>
                <View style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder }]}>
                  {additionalCandidates.map((candidate, index) => (
                    <View key={candidate.fabric} style={[styles.altCandidateRow, index > 0 && { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: glassBorder }]}>
                      <Text style={[styles.altCandidateName, { color: theme.text }]}>{fabricName(candidate.fabric)}</Text>
                      <Text style={[styles.altCandidateConfidence, { color: theme.textMuted }]}>{Math.round(candidate.confidence * 100)}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {result.careGuidance.washing || result.careGuidance.drying || result.careGuidance.ironing ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Recommended Care</Text>
                <View style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder, gap: 16 }]}>
                  {result.careGuidance.washing ? (
                    <View style={styles.careRow}>
                      <View style={[styles.careIconBox, { backgroundColor: iconBg }]}>
                        <MaterialCommunityIcons name="washing-machine" size={20} color={theme.primary} />
                      </View>
                      <View style={styles.careContent}>
                        <Text style={[styles.careTitle, { color: theme.text }]}>Washing</Text>
                        <Text style={[styles.careDescription, { color: theme.textMuted }]}>{result.careGuidance.washing}</Text>
                      </View>
                    </View>
                  ) : null}

                  {result.careGuidance.drying ? (
                    <View style={styles.careRow}>
                      <View style={[styles.careIconBox, { backgroundColor: iconBg }]}>
                        <MaterialCommunityIcons name="tumble-dryer" size={20} color={theme.primary} />
                      </View>
                      <View style={styles.careContent}>
                        <Text style={[styles.careTitle, { color: theme.text }]}>Drying</Text>
                        <Text style={[styles.careDescription, { color: theme.textMuted }]}>{result.careGuidance.drying}</Text>
                      </View>
                    </View>
                  ) : null}

                  {result.careGuidance.ironing ? (
                    <View style={styles.careRow}>
                      <View style={[styles.careIconBox, { backgroundColor: iconBg }]}>
                        <MaterialCommunityIcons name="iron" size={20} color={theme.primary} />
                      </View>
                      <View style={styles.careContent}>
                        <Text style={[styles.careTitle, { color: theme.text }]}>Ironing</Text>
                        <Text style={[styles.careDescription, { color: theme.textMuted }]}>{result.careGuidance.ironing}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {result.careGuidance.serviceRecommendation ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Recommended Service</Text>
                <View style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder }]}>
                  <View style={styles.careRow}>
                    <View style={[styles.careIconBox, { backgroundColor: iconBg }]}>
                      <MaterialCommunityIcons name={serviceIcon(result.careGuidance.serviceRecommendation)} size={20} color={theme.primary} />
                    </View>
                    <View style={styles.careContent}>
                      <Text style={[styles.careTitle, { color: theme.text }]}>{serviceName(result.careGuidance.serviceRecommendation)}</Text>
                      <Text style={[styles.careDescription, { color: theme.textMuted }]}>Recommended based on your fabric analysis</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}

            {result.warnings.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Review Notes</Text>
                <View style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder, gap: 12 }]}>
                  {result.warnings.map((warning, index) => (
                    <View key={`${warning}-${index}`} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
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
                  Always check the garment care label before washing or treating the fabric. The garment's care label is more authoritative than AI image analysis.
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={() => router.replace("/fabric-scan" as never)}>
            <MaterialIcons name="photo-camera" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>Scan Another Fabric</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={[styles.secondaryButton, { borderColor: glassBorder, backgroundColor: glassBg }]} onPress={() => router.push("/select-service")}>
            <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Continue with Manual Booking</Text>
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

  primaryFabricRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  fabricIconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  fabricContent: { flex: 1 },
  primaryFabricName: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  confidenceLabel: { fontSize: 13, marginBottom: 8 },
  confidenceBarBg: { height: 4, borderRadius: 2, backgroundColor: "rgba(148, 163, 184, 0.2)", width: "100%", overflow: "hidden" },
  confidenceBarFill: { height: "100%", borderRadius: 2 },

  altCandidateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  altCandidateName: { fontSize: 15, fontWeight: "600" },
  altCandidateConfidence: { fontSize: 14 },

  careRow: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  careIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  careContent: { flex: 1, paddingTop: 2 },
  careTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  careDescription: { fontSize: 14, lineHeight: 20 },

  warningText: { fontSize: 14, lineHeight: 20 },

  safetyText: { fontSize: 13, lineHeight: 20, flex: 1 },

  actionsContainer: { marginTop: 32, gap: 12 },
  primaryButton: { minHeight: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondaryButton: { minHeight: 54, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { fontSize: 15, fontWeight: "600" },
});
