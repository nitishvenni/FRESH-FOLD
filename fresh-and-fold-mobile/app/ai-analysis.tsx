import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "../components/Card";
import { useAppTheme } from "../hooks/useAppTheme";
import type { GarmentRecognitionResult, MappedGarmentDetection } from "../types/ai";
import { allItems } from "../utils/bookingData";

const parseResult = (value: string | string[] | undefined): GarmentRecognitionResult | null => {
  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value) as Partial<GarmentRecognitionResult>;
    return Array.isArray(parsed.detections) &&
      typeof parsed.status === "string" &&
      Array.isArray(parsed.warnings) &&
      typeof parsed.requestId === "string" &&
      parsed.requiresUserReview === true
      ? (parsed as GarmentRecognitionResult)
      : null;
  } catch {
    return null;
  }
};

const catalogName = (detection: MappedGarmentDetection) =>
  detection.catalogItemId
    ? allItems.find((item) => item.key === detection.catalogItemId)?.name ?? detection.catalogItemId
    : null;

export default function AiAnalysisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const params = useLocalSearchParams<{ result?: string }>();
  const result = useMemo(() => parseResult(params.result), [params.result]);
  const manualBooking = () => router.push("/select-service");
  const scanAgain = () => router.replace("/smart-scan" as never);

  const title =
    result?.status === "no_match"
      ? "No garment found"
      : result?.status === "unreadable"
        ? "Image needs another try"
        : "Review garments";

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 18 }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <TouchableOpacity accessibilityRole="button" style={styles.back} onPress={() => router.replace("/smart-scan" as never)}>
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Smart Scan</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>These are suggestions only. Review each item before using Manual Booking.</Text>

        {!result ? (
          <Card style={[styles.notice, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <Text style={[styles.noticeTitle, { color: theme.text }]}>Scan result unavailable</Text>
            <Text style={[styles.noticeCopy, { color: theme.textMuted }]}>Start another Smart Scan or continue with Manual Booking.</Text>
          </Card>
        ) : (
          <>
            {result.status !== "complete" ? (
              <Card style={[styles.notice, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                <MaterialIcons name="info-outline" size={22} color={theme.warning} />
                <Text style={[styles.noticeTitle, { color: theme.text }]}>Review needed</Text>
                <Text style={[styles.noticeCopy, { color: theme.textMuted }]}>Some garments may be unclear, unsupported, or not visible enough to identify.</Text>
              </Card>
            ) : null}

            {result.detections.map((detection, index) => {
              const mappedName = catalogName(detection);
              const needsAttention = !mappedName || detection.quantity === null || result.status !== "complete";
              return (
                <Card key={`${detection.detectedLabel}-${index}`} style={[styles.detectionCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                  <View style={styles.detectionHeader}>
                    <Text style={[styles.detectedLabel, { color: theme.text }]}>{detection.detectedLabel}</Text>
                    {needsAttention ? <Text style={[styles.attention, { color: theme.warning }]}>Needs review</Text> : null}
                  </View>
                  <Text style={[styles.detail, { color: theme.textMuted }]}>Quantity: {detection.quantity ?? "Unclear"}</Text>
                  <Text style={[styles.detail, { color: theme.textMuted }]}>Confidence: {Math.round(detection.confidence * 100)}% (advisory)</Text>
                  {mappedName ? (
                    <Text style={[styles.mapped, { color: theme.success }]}>Catalog match: {mappedName}</Text>
                  ) : (
                    <Text style={[styles.unmapped, { color: theme.warning }]}>Not in the current catalog</Text>
                  )}
                </Card>
              );
            })}

            {result.warnings.map((warning, index) => (
              <Text key={`${warning}-${index}`} style={[styles.warning, { color: theme.textMuted }]}>• {warning}</Text>
            ))}
          </>
        )}

        <TouchableOpacity accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={manualBooking}>
          <Text style={styles.primaryButtonText}>Continue with Manual Booking</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={[styles.secondaryButton, { borderColor: theme.border }]} onPress={scanAgain}>
          <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Scan Again</Text>
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
  notice: { marginTop: 24, alignItems: "center" },
  noticeTitle: { marginTop: 8, fontSize: 16, fontWeight: "700" },
  noticeCopy: { marginTop: 6, fontSize: 14, lineHeight: 20, textAlign: "center" },
  detectionCard: { marginTop: 16 },
  detectionHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  detectedLabel: { flex: 1, fontSize: 17, fontWeight: "700", textTransform: "capitalize" },
  attention: { fontSize: 12, fontWeight: "700" },
  detail: { marginTop: 7, fontSize: 14 },
  mapped: { marginTop: 10, fontSize: 14, fontWeight: "700" },
  unmapped: { marginTop: 10, fontSize: 14, fontWeight: "700" },
  warning: { marginTop: 10, fontSize: 14, lineHeight: 20 },
  primaryButton: { minHeight: 54, marginTop: 28, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondaryButton: { minHeight: 52, marginTop: 12, borderWidth: 1, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { fontSize: 15, fontWeight: "600" },
});
