import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../hooks/useAppTheme";
import { reportAiInteractionEvent } from "../services/aiService";
import { homeDesign } from "../theme/theme";
import type { AiAnalysisStatus, BookingReviewItem, GarmentRecognitionResult } from "../types/ai";
import { countSmartScanCorrections } from "../utils/aiInteractionMetrics";
import {
  buildSmartScanBookingPrefill,
  createBookingReviewItems,
  removeReviewItem,
  serializeSmartScanBookingPrefill,
  setReviewItemQuantity,
} from "../utils/aiBookingDraft";
import { allItems } from "../utils/bookingData";

type ScanReviewStatus = "ready" | "needs_review" | "unsupported" | "removed";

type ScanError = {
  title: string;
  message: string;
};

const parseResult = (value: string | string[] | undefined): GarmentRecognitionResult | null => {
  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value) as Partial<GarmentRecognitionResult>;
    return Array.isArray(parsed.detections)
      && typeof parsed.status === "string"
      && Array.isArray(parsed.warnings)
      && typeof parsed.requestId === "string"
      && parsed.requiresUserReview === true
      ? (parsed as GarmentRecognitionResult)
      : null;
  } catch {
    return null;
  }
};

const getItemStatus = (item: BookingReviewItem, resultStatus: AiAnalysisStatus): ScanReviewStatus => {
  if (item.removed) return "removed";
  if (!item.catalogItemId) return "unsupported";
  if (item.quantity === null || resultStatus !== "complete") return "needs_review";
  return "ready";
};

const getCategoryIcon = (catalogItemId: BookingReviewItem["catalogItemId"]): React.ComponentProps<typeof MaterialIcons>["name"] => {
  switch (catalogItemId) {
    case "jeans":
    case "trousers":
    case "shorts":
    case "leggings":
    case "skirt":
      return "accessibility-new";
    case "bedsheet":
    case "blanket":
    case "pillowcover":
    case "towel":
    case "curtain":
      return "weekend";
    default:
      return "checkroom";
  }
};

const getCatalogName = (item: BookingReviewItem) =>
  item.catalogItemId
    ? allItems.find((catalogItem) => catalogItem.key === item.catalogItemId)?.name ?? item.catalogItemId
    : null;

const GarmentReviewCard = memo(function GarmentReviewCard({
  item,
  resultStatus,
  onQuantityChange,
  onRemove,
}: {
  item: BookingReviewItem;
  resultStatus: AiAnalysisStatus;
  onQuantityChange: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}) {
  const { theme } = useAppTheme();
  const status = getItemStatus(item, resultStatus);
  const catalogName = getCatalogName(item);
  const confidence = Math.round(item.confidence * 100);
  const accent = status === "ready" ? theme.success : status === "needs_review" ? theme.warning : status === "unsupported" ? theme.danger : theme.textMuted;
  const statusLabel = status === "ready" ? "Ready" : status === "needs_review" ? "Needs review" : status === "unsupported" ? "Unsupported" : "Removed";
  const statusIcon = status === "ready" ? "check" : status === "needs_review" ? "edit" : status === "unsupported" ? "close" : "remove";
  const statusCopy = status === "ready"
    ? "Mapped and ready for booking."
    : status === "needs_review"
      ? item.quantity === null ? "Choose a quantity before continuing." : "Review this item before continuing."
      : status === "unsupported"
        ? "Not in the current catalog and cannot be added automatically."
        : "Removed from the booking prefill.";

  return (
    <View style={[styles.garmentCard, { backgroundColor: theme.homeSurfaceElevated, borderColor: theme.aiCareGlassBorder }]}>
      <View pointerEvents="none" style={[styles.glassHighlight, { backgroundColor: theme.aiCareGlassHighlight }]} />
      <View style={[styles.garmentIcon, { backgroundColor: status === "ready" ? theme.successSoft : status === "needs_review" ? theme.surfaceAlt : theme.primarySoft, borderColor: theme.aiCareGlassBorder }]}>
        <MaterialIcons name={getCategoryIcon(item.catalogItemId)} size={26} color={accent} />
      </View>
      <View style={styles.garmentContent}>
        <View style={styles.garmentTitleRow}>
          <Text maxFontSizeMultiplier={1.2} style={[styles.garmentTitle, { color: theme.text }]}>{catalogName ?? item.detectedLabel}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status === "ready" ? theme.successSoft : status === "needs_review" ? theme.surfaceAlt : theme.primarySoft }]}>
            <MaterialIcons name={statusIcon} size={14} color={accent} />
            <Text maxFontSizeMultiplier={1.15} style={[styles.statusBadgeText, { color: accent }]}>{statusLabel}</Text>
          </View>
        </View>
        {catalogName && catalogName !== item.detectedLabel ? (
          <Text maxFontSizeMultiplier={1.2} style={[styles.detectedFrom, { color: theme.textMuted }]}>Detected as: {item.detectedLabel}</Text>
        ) : null}
        <Text maxFontSizeMultiplier={1.2} style={[styles.garmentDetail, { color: theme.textMuted }]}>Confidence {confidence}% · Advisory only</Text>
        <View style={[styles.confidenceTrack, { backgroundColor: theme.surfaceAlt }]}>
          <View style={[styles.confidenceFill, { width: `${Math.max(4, Math.min(100, confidence))}%`, backgroundColor: accent }]} />
        </View>
        <Text maxFontSizeMultiplier={1.2} style={[styles.statusCopy, { color: theme.textMuted }]}>{statusCopy}</Text>

        {item.catalogItemId && !item.removed ? (
          <View style={styles.reviewControls}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Decrease ${catalogName ?? item.detectedLabel} quantity`}
              disabled={item.quantity === null || item.quantity <= 1}
              onPress={() => onQuantityChange(item.id, -1)}
              style={[styles.quantityButton, { borderColor: theme.aiCareGlassBorder, opacity: item.quantity === null || item.quantity <= 1 ? 0.45 : 1 }]}
            >
              <MaterialIcons name="remove" size={18} color={theme.text} />
            </TouchableOpacity>
            <Text maxFontSizeMultiplier={1.2} style={[styles.quantityLabel, { color: theme.text }]}>Qty {item.quantity ?? "?"}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Increase ${catalogName ?? item.detectedLabel} quantity`}
              onPress={() => onQuantityChange(item.id, 1)}
              style={[styles.quantityButton, { borderColor: theme.aiCareGlassBorder }]}
            >
              <MaterialIcons name="add" size={18} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Remove ${catalogName ?? item.detectedLabel} from booking`} onPress={() => onRemove(item.id)} style={styles.removeButton}>
              <Text maxFontSizeMultiplier={1.15} style={[styles.removeText, { color: theme.warning }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
});

function ReviewSection({
  title,
  copy,
  icon,
  iconColor,
  items,
  resultStatus,
  onQuantityChange,
  onRemove,
}: {
  title: string;
  copy: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  iconColor: string;
  items: BookingReviewItem[];
  resultStatus: AiAnalysisStatus;
  onQuantityChange: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}) {
  const { theme } = useAppTheme();
  if (items.length === 0) return null;

  return (
    <View style={[styles.sectionCard, { backgroundColor: theme.aiCareCardGlass, borderColor: theme.aiCareGlassBorder }]}>
      <View pointerEvents="none" style={[styles.glassHighlight, { backgroundColor: theme.aiCareGlassHighlight }]} />
      <View style={styles.sectionHeading}>
        <View style={[styles.sectionIcon, { backgroundColor: theme.surfaceAlt, borderColor: theme.aiCareGlassBorder }]}>
          <MaterialIcons name={icon} size={19} color={iconColor} />
        </View>
        <View style={styles.sectionCopyWrap}>
          <Text maxFontSizeMultiplier={1.2} style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
          <Text maxFontSizeMultiplier={1.25} style={[styles.sectionCopy, { color: theme.textMuted }]}>{copy}</Text>
        </View>
      </View>
      <View style={styles.sectionItems}>
        {items.map((item) => (
          <GarmentReviewCard key={item.id} item={item} resultStatus={resultStatus} onQuantityChange={onQuantityChange} onRemove={onRemove} />
        ))}
      </View>
    </View>
  );
}

export default function AiAnalysisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { theme } = useAppTheme();
  const params = useLocalSearchParams<{ result?: string }>();
  const result = useMemo(() => parseResult(params.result), [params.result]);
  const initialReviewItems = useMemo(() => (result ? createBookingReviewItems(result) : []), [result]);
  const [reviewItems, setReviewItems] = useState<BookingReviewItem[]>(initialReviewItems);
  const initialReviewItemsRef = useRef(initialReviewItems);
  const [reviewError, setReviewError] = useState<ScanError | null>(null);
  const compact = width < 360;

  useEffect(() => {
    setReviewItems(initialReviewItems);
    initialReviewItemsRef.current = initialReviewItems;
    setReviewError(null);
  }, [initialReviewItems]);

  const manualBooking = useCallback(() => router.push("/select-service"), [router]);
  const scanAgain = useCallback(() => router.replace("/smart-scan" as never), [router]);

  const changeQuantity = useCallback((id: string, delta: number) => {
    setReviewError(null);
    setReviewItems((current) => {
      const item = current.find((candidate) => candidate.id === id);
      if (!item || item.removed || !item.catalogItemId) return current;
      const nextQuantity = Math.max(1, (item.quantity ?? 0) + delta);
      return setReviewItemQuantity(current, id, nextQuantity);
    });
  }, []);

  const removeFromPrefill = useCallback((id: string) => {
    setReviewError(null);
    setReviewItems((current) => removeReviewItem(current, id));
  }, []);

  const continueToBooking = useCallback(() => {
    const buildResult = buildSmartScanBookingPrefill(reviewItems);
    if (buildResult.unresolvedQuantityItemIds.length > 0) {
      setReviewError({ title: "Quantity needed", message: "Choose a quantity or remove every mapped garment with an unclear quantity." });
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
  }, [manualBooking, result?.requestId, reviewItems, router]);

  const groups = useMemo(() => {
    const status = result?.status ?? "partial";
    return reviewItems.reduce<Record<ScanReviewStatus, BookingReviewItem[]>>(
      (accumulator, item) => {
        accumulator[getItemStatus(item, status)].push(item);
        return accumulator;
      },
      { ready: [], needs_review: [], unsupported: [], removed: [] }
    );
  }, [result?.status, reviewItems]);

  const activeCount = reviewItems.filter((item) => !item.removed).length;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}
      >
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to Smart Scan" accessibilityHint="Returns to Smart Scan." hitSlop={8} onPress={scanAgain} style={[styles.backButton, { backgroundColor: theme.headerButtonBg, borderColor: theme.headerButtonBorder }]}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text maxFontSizeMultiplier={1.15} style={[styles.title, { color: theme.text }]}>Review Garments</Text>
            <Text maxFontSizeMultiplier={1.2} style={[styles.subtitle, { color: theme.textMuted }]}>AI has detected the following items. Please review and confirm.</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {!result ? (
          <View style={[styles.noticeCard, { backgroundColor: theme.homeSurfaceElevated, borderColor: theme.aiCareGlassBorder }]}>
            <MaterialIcons name="info-outline" size={23} color={theme.warning} />
            <Text maxFontSizeMultiplier={1.2} style={[styles.noticeTitle, { color: theme.text }]}>Scan result unavailable</Text>
            <Text maxFontSizeMultiplier={1.25} style={[styles.noticeCopy, { color: theme.textMuted }]}>Start another Smart Scan or continue with Manual Booking.</Text>
          </View>
        ) : (
          <>
            <View style={[styles.summaryCard, { backgroundColor: theme.aiCareCardGlass, borderColor: theme.aiCareGlassBorder }]}>
              <View pointerEvents="none" style={[styles.glassHighlight, { backgroundColor: theme.aiCareGlassHighlight }]} />
              <View style={styles.summaryHeading}>
                <View style={[styles.summaryIcon, { backgroundColor: theme.primarySoft, borderColor: theme.aiCareGlassBorder }]}>
                  <MaterialIcons name="auto-awesome" size={22} color={theme.primary} />
                </View>
                <View>
                  <Text maxFontSizeMultiplier={1.2} style={[styles.summaryTitle, { color: theme.text }]}>Analysis Summary</Text>
                  <Text maxFontSizeMultiplier={1.2} style={[styles.summaryCopy, { color: theme.textMuted }]}>{activeCount} {activeCount === 1 ? "item" : "items"} detected</Text>
                </View>
              </View>
              <View style={[styles.summaryStats, compact && styles.summaryStatsCompact]}>
                <SummaryStat label="Ready" count={groups.ready.length} icon="check" color={theme.success} surface={theme.successSoft} />
                <SummaryStat label="Needs review" count={groups.needs_review.length} icon="edit" color={theme.warning} surface={theme.surfaceAlt} />
                <SummaryStat label="Unsupported" count={groups.unsupported.length} icon="close" color={theme.danger} surface={theme.primarySoft} />
                <SummaryStat label="Removed" count={groups.removed.length} icon="remove" color={theme.textMuted} surface={theme.surfaceAlt} />
              </View>
            </View>

            {result.status !== "complete" ? (
              <View style={[styles.resultNotice, { backgroundColor: theme.homeSurfaceElevated, borderColor: theme.aiCareGlassBorder }]}>
                <MaterialIcons name="info-outline" size={20} color={theme.warning} />
                <Text maxFontSizeMultiplier={1.25} style={[styles.resultNoticeText, { color: theme.textMuted }]}>Some garments may be unclear, unsupported, or not visible enough to identify. Review before continuing.</Text>
              </View>
            ) : null}

            <ReviewSection title="Ready to add" copy="Mapped items with confirmed quantities." icon="check-circle" iconColor={theme.success} items={groups.ready} resultStatus={result.status} onQuantityChange={changeQuantity} onRemove={removeFromPrefill} />
            <ReviewSection title="Needs Review" copy="Choose a quantity or review these items before booking." icon="edit" iconColor={theme.warning} items={groups.needs_review} resultStatus={result.status} onQuantityChange={changeQuantity} onRemove={removeFromPrefill} />
            <ReviewSection title="Unsupported Items" copy="These labels are not in the current booking catalog." icon="block" iconColor={theme.danger} items={groups.unsupported} resultStatus={result.status} onQuantityChange={changeQuantity} onRemove={removeFromPrefill} />
            <ReviewSection title="Removed Items" copy="These will not be included in your booking." icon="remove-circle-outline" iconColor={theme.textMuted} items={groups.removed} resultStatus={result.status} onQuantityChange={changeQuantity} onRemove={removeFromPrefill} />

            {result.warnings.length > 0 ? (
              <View style={[styles.warningsCard, { backgroundColor: theme.homeSurfaceElevated, borderColor: theme.aiCareGlassBorder }]}>
                <MaterialIcons name="info-outline" size={19} color={theme.warning} />
                <View style={styles.warningCopyWrap}>
                  {result.warnings.map((warning, index) => (
                    <Text key={`${warning}-${index}`} maxFontSizeMultiplier={1.2} style={[styles.warning, { color: theme.textMuted }]}>• {warning}</Text>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}

        <View style={[styles.addCard, { backgroundColor: theme.aiCareCardGlass, borderColor: theme.aiCareGlassBorder }]}>
          <View pointerEvents="none" style={[styles.glassHighlight, { backgroundColor: theme.aiCareGlassHighlight }]} />
          <View style={styles.addHeading}>
            <View style={[styles.sectionIcon, { backgroundColor: theme.primarySoft, borderColor: theme.aiCareGlassBorder }]}>
              <MaterialIcons name="add" size={22} color={theme.primary} />
            </View>
            <View style={styles.sectionCopyWrap}>
              <Text maxFontSizeMultiplier={1.2} style={[styles.sectionTitle, { color: theme.text }]}>Add Missing Item</Text>
              <Text maxFontSizeMultiplier={1.25} style={[styles.sectionCopy, { color: theme.textMuted }]}>Did we miss something? Add it here.</Text>
            </View>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add another garment" accessibilityHint="Starts the existing Manual Booking item flow." onPress={manualBooking} style={[styles.addAction, { borderColor: theme.headerButtonBorder, backgroundColor: theme.homeSurfaceElevated }]}>
            <View style={[styles.addActionIcon, { backgroundColor: theme.primarySoft }]}><MaterialIcons name="add-circle-outline" size={24} color={theme.primary} /></View>
            <View style={styles.addActionCopy}>
              <Text maxFontSizeMultiplier={1.2} style={[styles.addActionTitle, { color: theme.text }]}>Add Another Garment</Text>
              <Text maxFontSizeMultiplier={1.2} style={[styles.addActionText, { color: theme.textMuted }]}>Choose from supported booking categories</Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.whyCard, { backgroundColor: theme.homeSurfaceElevated, borderColor: theme.aiCareGlassBorder }]}>
          <View style={[styles.whyIcon, { backgroundColor: theme.primarySoft }]}><MaterialIcons name="verified-user" size={25} color={theme.primary} /></View>
          <View style={styles.whyCopyWrap}>
            <Text maxFontSizeMultiplier={1.2} style={[styles.whyTitle, { color: theme.text }]}>Why review is important</Text>
            <Text maxFontSizeMultiplier={1.25} style={[styles.whyCopy, { color: theme.textMuted }]}>Only reviewed, supported items are sent to your booking.</Text>
          </View>
        </View>

        {reviewError ? (
          <View style={[styles.errorCard, { backgroundColor: theme.homeSurfaceElevated, borderColor: theme.warning }]}>
            <MaterialIcons name="info-outline" size={20} color={theme.warning} />
            <View style={styles.errorCopyWrap}>
              <Text maxFontSizeMultiplier={1.2} style={[styles.errorTitle, { color: theme.text }]}>{reviewError.title}</Text>
              <Text maxFontSizeMultiplier={1.25} style={[styles.errorText, { color: theme.textMuted }]}>{reviewError.message}</Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Continue to Booking" accessibilityHint="Uses your reviewed garments in the existing booking flow." onPress={continueToBooking} style={[styles.continueButton, { backgroundColor: theme.primary, borderColor: theme.headerButtonBorder }]}>
          <Text maxFontSizeMultiplier={1.2} style={styles.continueText}>Continue to Booking</Text>
          <MaterialIcons name="arrow-forward" size={21} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Scan again" accessibilityHint="Returns to Smart Scan to choose another image." onPress={scanAgain} style={styles.scanAgainButton}>
          <Text maxFontSizeMultiplier={1.2} style={[styles.scanAgainText, { color: theme.primary }]}>Scan Again</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function SummaryStat({ label, count, icon, color, surface }: { label: string; count: number; icon: React.ComponentProps<typeof MaterialIcons>["name"]; color: string; surface: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.summaryStat, { backgroundColor: theme.homeSurfaceElevated, borderColor: theme.aiCareGlassBorder }]}>
      <View style={[styles.summaryStatIcon, { backgroundColor: surface }]}><MaterialIcons name={icon} size={17} color={color} /></View>
      <Text maxFontSizeMultiplier={1.15} style={[styles.summaryStatCount, { color: theme.text }]}>{count}</Text>
      <Text maxFontSizeMultiplier={1.1} style={[styles.summaryStatLabel, { color }]}>{label}</Text>
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
  subtitle: { marginTop: 3, maxWidth: 270, fontSize: 13, lineHeight: 18, textAlign: "center" },
  glassHighlight: { position: "absolute", top: 0, left: 16, right: 16, height: 1, borderRadius: 1 },
  noticeCard: { minHeight: 154, marginTop: 16, borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 20, alignItems: "center", justifyContent: "center" },
  noticeTitle: { marginTop: 9, fontSize: 18, lineHeight: 23, fontWeight: "700" },
  noticeCopy: { marginTop: 6, fontSize: 13, lineHeight: 19, textAlign: "center" },
  summaryCard: { position: "relative", marginTop: 16, overflow: "hidden", borderRadius: homeDesign.cardRadius, borderWidth: 1, padding: 15 },
  summaryHeading: { flexDirection: "row", alignItems: "center" },
  summaryIcon: { width: 46, height: 46, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  summaryTitle: { marginLeft: 11, fontSize: 18, lineHeight: 23, fontWeight: "700", letterSpacing: -0.3 },
  summaryCopy: { marginTop: 2, marginLeft: 11, fontSize: 13, lineHeight: 18 },
  summaryStats: { flexDirection: "row", gap: 8, marginTop: 15 },
  summaryStatsCompact: { flexWrap: "wrap" },
  summaryStat: { flex: 1, minHeight: 94, borderRadius: 16, borderWidth: 1, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  summaryStatIcon: { width: 27, height: 27, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  summaryStatCount: { marginTop: 4, fontSize: 19, lineHeight: 23, fontWeight: "700" },
  summaryStatLabel: { marginTop: 1, paddingHorizontal: 3, fontSize: 9.5, lineHeight: 13, fontWeight: "700", textAlign: "center" },
  resultNotice: { marginTop: 14, borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 13, flexDirection: "row", alignItems: "flex-start" },
  resultNoticeText: { flex: 1, marginLeft: 9, fontSize: 12.5, lineHeight: 18 },
  sectionCard: { position: "relative", marginTop: 14, overflow: "hidden", borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 14 },
  sectionHeading: { flexDirection: "row", alignItems: "center" },
  sectionIcon: { width: 38, height: 38, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  sectionCopyWrap: { flex: 1, marginLeft: 10 },
  sectionTitle: { fontSize: 17, lineHeight: 22, fontWeight: "700", letterSpacing: -0.28 },
  sectionCopy: { marginTop: 2, fontSize: 12.5, lineHeight: 18 },
  sectionItems: { gap: 10, marginTop: 13 },
  garmentCard: { position: "relative", overflow: "hidden", minHeight: 152, borderRadius: 18, borderWidth: 1, padding: 12, flexDirection: "row" },
  garmentIcon: { width: 56, height: 64, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  garmentContent: { flex: 1, marginLeft: 11 },
  garmentTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  garmentTitle: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: "700", letterSpacing: -0.24 },
  statusBadge: { minHeight: 24, borderRadius: 12, paddingHorizontal: 7, flexDirection: "row", alignItems: "center" },
  statusBadgeText: { marginLeft: 3, fontSize: 10, lineHeight: 13, fontWeight: "700" },
  detectedFrom: { marginTop: 2, fontSize: 11.5, lineHeight: 16 },
  garmentDetail: { marginTop: 5, fontSize: 11.5, lineHeight: 16 },
  confidenceTrack: { height: 4, marginTop: 6, borderRadius: 2, overflow: "hidden" },
  confidenceFill: { height: "100%", borderRadius: 2 },
  statusCopy: { marginTop: 6, fontSize: 11.5, lineHeight: 16 },
  reviewControls: { marginTop: 9, flexDirection: "row", alignItems: "center", gap: 7 },
  quantityButton: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  quantityLabel: { minWidth: 43, fontSize: 12, fontWeight: "700", textAlign: "center" },
  removeButton: { minHeight: 34, marginLeft: "auto", justifyContent: "center", paddingHorizontal: 4 },
  removeText: { fontSize: 12, fontWeight: "700" },
  warningsCard: { marginTop: 14, borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 13, flexDirection: "row", alignItems: "flex-start" },
  warningCopyWrap: { flex: 1, marginLeft: 9, gap: 4 },
  warning: { fontSize: 12.5, lineHeight: 18 },
  addCard: { position: "relative", marginTop: 14, overflow: "hidden", borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 14 },
  addHeading: { flexDirection: "row", alignItems: "center" },
  addAction: { minHeight: 76, marginTop: 13, borderRadius: 17, borderWidth: 1, borderStyle: "dashed", paddingHorizontal: 12, flexDirection: "row", alignItems: "center" },
  addActionIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  addActionCopy: { flex: 1, marginLeft: 11 },
  addActionTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  addActionText: { marginTop: 2, fontSize: 11.5, lineHeight: 16 },
  whyCard: { minHeight: 86, marginTop: 14, borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center" },
  whyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  whyCopyWrap: { flex: 1, marginLeft: 12 },
  whyTitle: { fontSize: 16, lineHeight: 21, fontWeight: "700" },
  whyCopy: { marginTop: 3, fontSize: 12.5, lineHeight: 18 },
  errorCard: { marginTop: 14, borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 13, flexDirection: "row", alignItems: "flex-start" },
  errorCopyWrap: { flex: 1, marginLeft: 9 },
  errorTitle: { fontSize: 14, lineHeight: 19, fontWeight: "700" },
  errorText: { marginTop: 2, fontSize: 12.5, lineHeight: 18 },
  continueButton: { minHeight: 56, marginTop: 18, borderRadius: 18, borderWidth: 1, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", shadowColor: "#2563EB", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  continueText: { color: "#FFFFFF", fontSize: 17, lineHeight: 22, fontWeight: "700" },
  scanAgainButton: { alignSelf: "center", minHeight: 46, marginTop: 4, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  scanAgainText: { fontSize: 14, fontWeight: "700" },
});
