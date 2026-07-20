import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "../components/Card";
import { useAppTheme } from "../hooks/useAppTheme";
import type { BookingReviewItem, GarmentRecognitionResult } from "../types/ai";
import { allItems } from "../utils/bookingData";
import {
  buildSmartScanBookingPrefill,
  createBookingReviewItems,
  removeReviewItem,
  serializeSmartScanBookingPrefill,
  setReviewItemQuantity,
} from "../utils/aiBookingDraft";
import { reportAiInteractionEvent } from "../services/aiService";
import { countSmartScanCorrections } from "../utils/aiInteractionMetrics";

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

export default function AiAnalysisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const params = useLocalSearchParams<{ result?: string }>();
  const result = useMemo(() => parseResult(params.result), [params.result]);
  const initialReviewItems = useMemo(
    () => (result ? createBookingReviewItems(result) : []),
    [result]
  );
  const [reviewItems, setReviewItems] = useState<BookingReviewItem[]>(initialReviewItems);
  const initialReviewItemsRef = useRef(initialReviewItems);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    setReviewItems(initialReviewItems);
    initialReviewItemsRef.current = initialReviewItems;
    setReviewError(null);
  }, [initialReviewItems]);

  const manualBooking = () => router.push("/select-service");
  const scanAgain = () => router.replace("/smart-scan" as never);

  const changeQuantity = (id: string, delta: number) => {
    setReviewError(null);
    setReviewItems((current) => {
      const item = current.find((candidate) => candidate.id === id);
      if (!item || item.removed || !item.catalogItemId) return current;
      const nextQuantity = Math.max(1, (item.quantity ?? 0) + delta);
      return setReviewItemQuantity(current, id, nextQuantity);
    });
  };

  const removeFromPrefill = (id: string) => {
    setReviewError(null);
    setReviewItems((current) => removeReviewItem(current, id));
  };

  const continueToBooking = () => {
    const buildResult = buildSmartScanBookingPrefill(reviewItems);
    if (buildResult.unresolvedQuantityItemIds.length > 0) {
      setReviewError("Choose a quantity or remove every mapped garment with an unclear quantity.");
      return;
    }

    if (result?.requestId) {
      const correctionCount = countSmartScanCorrections(initialReviewItemsRef.current, reviewItems);
      reportAiInteractionEvent({ requestId: result.requestId, event: "reviewed", correctionCount });
    }

    if (!buildResult.prefill) {
      manualBooking();
      return;
    }

    if (result?.requestId) reportAiInteractionEvent({ requestId: result.requestId, event: "continued_to_booking" });

    router.push({
      pathname: "/select-service",
      params: { aiPrefill: serializeSmartScanBookingPrefill(buildResult.prefill) },
    });
  };

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

            {reviewItems.map((item) => {
              const mappedName = item.catalogItemId
                ? allItems.find((catalogItem) => catalogItem.key === item.catalogItemId)?.name ?? item.catalogItemId
                : null;
              const needsAttention = !mappedName || item.quantity === null || result.status !== "complete";
              return (
                <Card key={item.id} style={[styles.detectionCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                  <View style={styles.detectionHeader}>
                    <Text style={[styles.detectedLabel, { color: theme.text }]}>{item.detectedLabel}</Text>
                    {needsAttention ? <Text style={[styles.attention, { color: theme.warning }]}>Needs review</Text> : null}
                  </View>
                  <Text style={[styles.detail, { color: theme.textMuted }]}>Confidence: {Math.round(item.confidence * 100)}% (advisory)</Text>
                  {mappedName ? (
                    <>
                      <Text style={[styles.mapped, { color: theme.success }]}>Catalog match: {mappedName}</Text>
                      {item.removed ? (
                        <Text style={[styles.unmapped, { color: theme.textMuted }]}>Removed from booking prefill</Text>
                      ) : (
                        <View style={styles.reviewControls}>
                          <TouchableOpacity
                            accessibilityRole="button"
                            onPress={() => changeQuantity(item.id, -1)}
                            style={[styles.quantityButton, { borderColor: theme.border }]}
                          >
                            <MaterialIcons name="remove" size={18} color={theme.text} />
                          </TouchableOpacity>
                          <Text style={[styles.reviewQuantity, { color: theme.text }]}>Quantity: {item.quantity ?? "Choose"}</Text>
                          <TouchableOpacity
                            accessibilityRole="button"
                            onPress={() => changeQuantity(item.id, 1)}
                            style={[styles.quantityButton, { borderColor: theme.border }]}
                          >
                            <MaterialIcons name="add" size={18} color={theme.text} />
                          </TouchableOpacity>
                          <TouchableOpacity accessibilityRole="button" onPress={() => removeFromPrefill(item.id)}>
                            <Text style={[styles.removeText, { color: theme.warning }]}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  ) : (
                    <Text style={[styles.unmapped, { color: theme.warning }]}>Not in the current catalog and cannot be added automatically</Text>
                  )}
                </Card>
              );
            })}

            {result.warnings.map((warning, index) => (
              <Text key={`${warning}-${index}`} style={[styles.warning, { color: theme.textMuted }]}>• {warning}</Text>
            ))}
          </>
        )}

        {reviewError ? <Text style={[styles.reviewError, { color: theme.warning }]}>{reviewError}</Text> : null}

        <TouchableOpacity accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={continueToBooking}>
          <Text style={styles.primaryButtonText}>Review and Continue to Booking</Text>
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
  reviewControls: { marginTop: 12, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 },
  quantityButton: { width: 34, height: 34, borderWidth: 1, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  reviewQuantity: { fontSize: 14, fontWeight: "700" },
  removeText: { fontSize: 13, fontWeight: "700" },
  warning: { marginTop: 10, fontSize: 14, lineHeight: 20 },
  reviewError: { marginTop: 20, fontSize: 14, lineHeight: 20, textAlign: "center" },
  primaryButton: { minHeight: 54, marginTop: 28, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondaryButton: { minHeight: 52, marginTop: 12, borderWidth: 1, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { fontSize: 15, fontWeight: "600" },
});
