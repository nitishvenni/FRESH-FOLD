import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../hooks/useAppTheme";
import type { BookingReviewItem, NaturalLanguageBookingResult } from "../types/ai";
import {
  buildNaturalLanguageBookingPrefill,
  createBookingReviewItems,
  getDefaultNaturalLanguageBookingSelections,
  removeReviewItem,
  serializeNaturalLanguageBookingPrefill,
  setReviewItemQuantity,
} from "../utils/aiBookingDraft";
import { allItems, isItemKey } from "../utils/bookingData";
import { reportAiInteractionEvent } from "../services/aiService";
import { reportAiCancellationOnce } from "../utils/aiCancellation";
import { countNaturalLanguageCorrections } from "../utils/aiInteractionMetrics";
import { formatBookingDate, getRelativeBookingDateLabel, isPickupSlot, PICKUP_SLOTS } from "../utils/bookingSchedule";

const cleaningLabel: Record<"wash" | "dry", string> = { wash: "Wash & Iron", dry: "Dry Clean" };
const speedLabel: Record<"standard" | "express", string> = { standard: "Standard", express: "Express" };

const unresolvedSet = new Set(["items", "quantity", "cleaning_service", "speed", "pickup_date", "pickup_slot", "special_instructions"]);
const formatUnresolvedField = (field: string) => ({
  items: "Items need review",
  quantity: "Item quantities need review",
  cleaning_service: "Cleaning service needs review",
  speed: "Delivery speed needs review",
  pickup_date: "Pickup date needs confirmation",
  pickup_slot: "Pickup time needs confirmation",
  special_instructions: "Special instructions need review",
}[field] ?? "Booking detail needs review");

const formatWarning = (warning: string) => warning
  .replace(/pickup[_ ]?date/gi, "pickup date")
  .replace(/pickup[_ ]?slot/gi, "pickup time");

const parseResult = (value: string | string[] | undefined): NaturalLanguageBookingResult | null => {
  if (typeof value !== "string") return null;
  try {
    const result = JSON.parse(value) as NaturalLanguageBookingResult;
    const validItems = Array.isArray(result.items) && result.items.every((item) =>
      item && typeof item.detectedLabel === "string" && typeof item.normalizedLabel === "string" &&
      (item.catalogItemId === null || isItemKey(item.catalogItemId)) &&
      (item.mappingStatus === "mapped" || item.mappingStatus === "unmapped") &&
      (item.quantity === null || (Number.isInteger(item.quantity) && item.quantity > 0)) &&
      typeof item.confidence === "number"
    );
    const validCleaningService = result.cleaningService === null || result.cleaningService === "wash" || result.cleaningService === "dry";
    const validSpeed = result.speed === null || result.speed === "standard" || result.speed === "express";
    const validSlots = result.pickupSlot === null || isPickupSlot(result.pickupSlot);
    const validUnresolved = Array.isArray(result.unresolvedFields) && result.unresolvedFields.every((field) => unresolvedSet.has(field));
    if (
      !["complete", "partial", "no_match"].includes(result.status) || result.source !== "natural_language" ||
      result.requiresUserReview !== true || !validItems || !validCleaningService || !validSpeed || !validSlots || !validUnresolved ||
      !Array.isArray(result.warnings) || result.warnings.some((warning) => typeof warning !== "string") ||
      typeof result.requestId !== "string"
    ) return null;
    return result;
  } catch {
    return null;
  }
};

export default function AiBookingReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  
  const { result: resultParam } = useLocalSearchParams<{ result?: string }>();
  const result = useMemo(() => parseResult(resultParam), [resultParam]);
  const initialItems = useMemo(() => (result ? createBookingReviewItems(result) : []), [result]);
  
  const [reviewItems, setReviewItems] = useState<BookingReviewItem[]>(initialItems);
  const initialItemsRef = useRef(initialItems);
  const defaultSelections = useMemo(() => getDefaultNaturalLanguageBookingSelections(result), [result]);
  
  const [acceptedCleaningService, setAcceptedCleaningService] = useState<"wash" | "dry" | undefined>(defaultSelections.cleaningService);
  const [acceptedSpeed, setAcceptedSpeed] = useState<"standard" | "express" | undefined>(defaultSelections.speed);
  const [acceptedPickupDate, setAcceptedPickupDate] = useState<string | undefined>(defaultSelections.pickupDate);
  const [acceptedPickupSlot, setAcceptedPickupSlot] = useState<(typeof PICKUP_SLOTS)[number]["value"] | undefined>(defaultSelections.pickupSlot);
  
  const [showManualItems, setShowManualItems] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const cancellationReportedRef = useRef(false);

  useEffect(() => {
    setReviewItems(initialItems);
    initialItemsRef.current = initialItems;
    setAcceptedCleaningService(defaultSelections.cleaningService);
    setAcceptedSpeed(defaultSelections.speed);
    setAcceptedPickupDate(defaultSelections.pickupDate);
    setAcceptedPickupSlot(defaultSelections.pickupSlot);
    setReviewError(null);
    cancellationReportedRef.current = false;
  }, [initialItems, defaultSelections.cleaningService, defaultSelections.speed, defaultSelections.pickupDate, defaultSelections.pickupSlot]);

  const changeQuantity = (id: string, delta: number) => setReviewItems((items) => {
    const item = items.find((candidate) => candidate.id === id);
    if (!item || item.removed || !item.catalogItemId) return items;
    return setReviewItemQuantity(items, id, Math.max(1, (item.quantity ?? 0) + delta));
  });

  const addManualItem = (catalogItemId: (typeof allItems)[number]["key"]) => {
    setReviewItems((items) => items.some((item) => !item.removed && item.catalogItemId === catalogItemId)
      ? items
      : [...items, { id: `manual:${catalogItemId}`, detectedLabel: allItems.find((item) => item.key === catalogItemId)?.name ?? catalogItemId, catalogItemId, mappingStatus: "mapped", quantity: 1, confidence: 0, removed: false }]);
    setShowManualItems(false);
  };

  const continueToBooking = () => {
    const built = buildNaturalLanguageBookingPrefill(reviewItems, acceptedCleaningService, acceptedSpeed, acceptedPickupDate, acceptedPickupSlot);
    if (built.unresolvedQuantityItemIds.length > 0) {
      setReviewError("Choose a quantity or remove every mapped item with an unclear quantity.");
      return;
    }
    if (result?.requestId) reportAiInteractionEvent({ requestId: result.requestId, event: "reviewed", correctionCount: countNaturalLanguageCorrections(initialItemsRef.current, reviewItems, defaultSelections.cleaningService, acceptedCleaningService, defaultSelections.speed, acceptedSpeed) });
    if (!built.prefill) {
      router.push("/select-service");
      return;
    }
    if (result?.requestId) reportAiInteractionEvent({ requestId: result.requestId, event: "continued_to_booking" });
    router.push({ pathname: "/select-service", params: { aiPrefill: serializeNaturalLanguageBookingPrefill(built.prefill) } });
  };

  const discardAiDraft = () => {
    reportAiCancellationOnce(result?.requestId, cancellationReportedRef, reportAiInteractionEvent);
    router.replace("/ai-booking" as never);
  };

  const validItemCount = reviewItems.reduce((acc, item) => !item.removed && item.catalogItemId ? acc + (item.quantity ?? 0) : acc, 0);

  const glassBg = isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.7)";
  const glassBorder = isDark ? "rgba(148, 163, 184, 0.15)" : "rgba(148, 163, 184, 0.2)";

  if (!result) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" style={styles.backButton} onPress={() => router.replace("/ai-booking" as never)}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <View style={[styles.content, { flex: 1, justifyContent: "center", alignItems: "center" }]}>
          <MaterialIcons name="error-outline" size={48} color={theme.textMuted} style={{ marginBottom: 16 }} />
          <Text style={[styles.title, { color: theme.text, textAlign: "center" }]}>Draft unavailable</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted, textAlign: "center" }]}>We couldn't load this booking draft.</Text>
          <TouchableOpacity accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: theme.primary, width: "100%", marginTop: 32 }]} onPress={() => router.replace("/select-service" as never)}>
            <Text style={styles.primaryButtonText}>Continue to Manual Booking</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" style={styles.backButton} onPress={() => router.replace("/ai-booking" as never)}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Review Booking Draft</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Review and edit suggestions before opening the regular booking flow.
        </Text>

        <View style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Recognized Items</Text>
            {validItemCount > 0 && (
              <View style={[styles.countBadge, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.1)" }]}>
                <Text style={[styles.countBadgeText, { color: isDark ? "#93C5FD" : "#2563EB" }]}>{validItemCount} items</Text>
              </View>
            )}
          </View>
          
          {reviewItems.length === 0 ? (
            <Text style={[styles.copy, { color: theme.textMuted }]}>No supported items were extracted automatically.</Text>
          ) : (
            reviewItems.map((item, index) => {
              const isManual = item.id.startsWith("manual:");
              const mappedName = item.catalogItemId ? allItems.find((catalogItem) => catalogItem.key === item.catalogItemId)?.name : null;
              const isLast = index === reviewItems.length - 1;

              return (
                <View key={item.id} style={[styles.itemRow, !isLast && { borderBottomWidth: 1, borderBottomColor: glassBorder }]}>
                  <View style={styles.itemHeader}>
                    <Text style={[styles.itemLabel, { color: theme.text, opacity: item.removed ? 0.5 : 1 }]}>{item.detectedLabel}</Text>
                    {isManual ? <View style={[styles.manualBadge, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)" }]}><Text style={[styles.manualBadgeText, { color: isDark ? "#6EE7B7" : "#059669" }]}>Manual</Text></View> : null}
                  </View>
                  
                  {!isManual && !item.removed ? (
                    <Text style={[styles.confidence, { color: theme.textMuted }]}>Confidence: {Math.round(item.confidence * 100)}% (advisory)</Text>
                  ) : null}
                  
                  {mappedName ? (
                    <>
                      {item.removed ? (
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                          <Text style={[styles.copy, { color: theme.textMuted }]}>Removed from prefill</Text>
                          <TouchableOpacity onPress={() => changeQuantity(item.id, 0)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Text style={[styles.restoreText, { color: theme.primary }]}>Restore</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.itemControlsRow}>
                          <Text style={[styles.mappedText, { color: isDark ? "#A7F3D0" : "#059669" }]}>{mappedName}</Text>
                          
                          <View style={styles.quantityControls}>
                            <TouchableOpacity accessibilityRole="button" onPress={() => changeQuantity(item.id, -1)} disabled={item.quantity === 1} style={[styles.quantityBtn, { borderColor: glassBorder, opacity: item.quantity === 1 ? 0.3 : 1 }]}>
                              <MaterialIcons name="remove" size={16} color={theme.text} />
                            </TouchableOpacity>
                            <Text style={[styles.quantityValue, { color: theme.text }]}>{item.quantity ?? "?"}</Text>
                            <TouchableOpacity accessibilityRole="button" onPress={() => changeQuantity(item.id, 1)} style={[styles.quantityBtn, { borderColor: glassBorder }]}>
                              <MaterialIcons name="add" size={16} color={theme.text} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                      
                      {!item.removed && (
                        <TouchableOpacity accessibilityRole="button" onPress={() => setReviewItems((items) => removeReviewItem(items, item.id))} style={{ alignSelf: "flex-end", marginTop: 8 }}>
                          <Text style={[styles.removeText, { color: theme.warning }]}>Remove item</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  ) : (
                    <Text style={[styles.unmappedText, { color: theme.warning }]}>Not in the current catalog and cannot be added automatically. Must be removed.</Text>
                  )}
                  
                  {!mappedName && !item.removed && (
                    <TouchableOpacity accessibilityRole="button" onPress={() => setReviewItems((items) => removeReviewItem(items, item.id))} style={{ alignSelf: "flex-end", marginTop: 8 }}>
                      <Text style={[styles.removeText, { color: theme.warning }]}>Remove unsupported item</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}

          <TouchableOpacity accessibilityRole="button" style={[styles.addItemButton, { borderColor: glassBorder, backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }]} onPress={() => setShowManualItems((value) => !value)}>
            <MaterialIcons name={showManualItems ? "close" : "add"} size={18} color={theme.primary} />
            <Text style={[styles.addItemText, { color: theme.primary }]}>{showManualItems ? "Close" : "Add supported item manually"}</Text>
          </TouchableOpacity>
          
          {showManualItems ? (
            <View style={styles.manualItemsGrid}>
              {allItems.map((item) => (
                <TouchableOpacity key={item.key} accessibilityRole="button" onPress={() => addManualItem(item.key)} style={[styles.manualItemChip, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
                  <Text style={[styles.manualItemText, { color: theme.text }]}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 12 }]}>Service & Preferences</Text>
          
          <View style={[styles.preferenceRow, { borderBottomWidth: 1, borderBottomColor: glassBorder }]}>
            <View style={styles.preferenceIcon}><MaterialIcons name="local-laundry-service" size={20} color={theme.textMuted} /></View>
            <View style={styles.preferenceContent}>
              <Text style={[styles.preferenceLabel, { color: theme.textMuted }]}>Service Type</Text>
              {result.cleaningService ? (
                <TouchableOpacity onPress={() => setAcceptedCleaningService(acceptedCleaningService === result.cleaningService ? undefined : result.cleaningService || undefined)}>
                  <Text style={[styles.preferenceValue, { color: acceptedCleaningService === result.cleaningService ? (isDark ? "#93C5FD" : "#2563EB") : theme.text }]}>
                    {cleaningLabel[result.cleaningService]} {acceptedCleaningService === result.cleaningService ? "✓" : ""}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.preferenceValue, { color: theme.warning }]}>Select in booking</Text>
              )}
            </View>
          </View>

          <View style={[styles.preferenceRow, { borderBottomWidth: 1, borderBottomColor: glassBorder }]}>
            <View style={styles.preferenceIcon}><MaterialIcons name="bolt" size={20} color={theme.textMuted} /></View>
            <View style={styles.preferenceContent}>
              <Text style={[styles.preferenceLabel, { color: theme.textMuted }]}>Speed</Text>
              {result.speed ? (
                <TouchableOpacity onPress={() => setAcceptedSpeed(acceptedSpeed === result.speed ? undefined : result.speed || undefined)}>
                  <Text style={[styles.preferenceValue, { color: acceptedSpeed === result.speed ? (isDark ? "#93C5FD" : "#2563EB") : theme.text }]}>
                    {speedLabel[result.speed]} {acceptedSpeed === result.speed ? "✓" : ""}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.preferenceValue, { color: theme.warning }]}>Select in booking</Text>
              )}
            </View>
          </View>

          <View style={[styles.preferenceRow, { borderBottomWidth: 1, borderBottomColor: glassBorder }]}>
            <View style={styles.preferenceIcon}><MaterialIcons name="calendar-today" size={20} color={theme.textMuted} /></View>
            <View style={styles.preferenceContent}>
              <Text style={[styles.preferenceLabel, { color: theme.textMuted }]}>Pickup Date (Draft)</Text>
              {result.pickupDate ? (
                <TouchableOpacity onPress={() => setAcceptedPickupDate(acceptedPickupDate === result.pickupDate ? undefined : result.pickupDate ?? undefined)}>
                  <Text style={[styles.preferenceValue, { color: acceptedPickupDate === result.pickupDate ? (isDark ? "#93C5FD" : "#2563EB") : theme.text }]}>
                    {formatBookingDate(result.pickupDate)} {acceptedPickupDate === result.pickupDate ? "✓" : ""}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.preferenceValue, { color: theme.warning }]}>Select in booking</Text>
              )}
            </View>
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceIcon}><MaterialIcons name="schedule" size={20} color={theme.textMuted} /></View>
            <View style={styles.preferenceContent}>
              <Text style={[styles.preferenceLabel, { color: theme.textMuted }]}>Pickup Time (Draft)</Text>
              {result.pickupSlot ? (
                <TouchableOpacity onPress={() => setAcceptedPickupSlot(acceptedPickupSlot === result.pickupSlot ? undefined : result.pickupSlot ?? undefined)}>
                  <Text style={[styles.preferenceValue, { color: acceptedPickupSlot === result.pickupSlot ? (isDark ? "#93C5FD" : "#2563EB") : theme.text }]}>
                    {result.pickupSlot} {acceptedPickupSlot === result.pickupSlot ? "✓" : ""}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.preferenceValue, { color: theme.warning }]}>Select in booking</Text>
              )}
            </View>
          </View>
          
          {result.pickupPreference ? (
             <View style={[styles.noteBox, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", marginTop: 12 }]}>
               <Text style={[styles.noteText, { color: theme.textMuted }]}>Preference: {result.pickupPreference}</Text>
             </View>
          ) : null}
        </View>

        {result.unresolvedFields.length > 0 || result.warnings.length > 0 ? (
          <View style={[styles.card, { backgroundColor: isDark ? "rgba(245, 158, 11, 0.1)" : "rgba(245, 158, 11, 0.05)", borderColor: isDark ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.2)" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <MaterialIcons name="warning-amber" size={20} color={isDark ? "#FBBF24" : "#D97706"} />
              <Text style={[styles.cardTitle, { color: isDark ? "#FBBF24" : "#D97706" }]}>Needs Review</Text>
            </View>
            {result.unresolvedFields.map((field) => (
              <Text key={field} style={[styles.warningText, { color: isDark ? "#FBBF24" : "#D97706" }]}>• {formatUnresolvedField(field)}</Text>
            ))}
            {result.warnings.map((warning, index) => (
              <Text key={`${warning}-${index}`} style={[styles.warningText, { color: isDark ? "#FCD34D" : "#B45309" }]}>• {formatWarning(warning)}</Text>
            ))}
          </View>
        ) : null}

        {result.specialInstructions ? (
          <View style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <MaterialIcons name="note-alt" size={18} color={theme.textMuted} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Additional Instructions (Review-only)</Text>
            </View>
            <Text style={[styles.copy, { color: theme.textMuted, marginBottom: 8 }]}>This note was detected from your voice request but is NOT sent to order creation or payment. If required, please inform the driver manually.</Text>
            <View style={[styles.noteBox, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", borderColor: glassBorder }]}>
              <Text style={[styles.noteText, { color: theme.text }]}>{result.specialInstructions}</Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.safetyCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <MaterialIcons name="verified-user" size={20} color={theme.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.safetyTitle, { color: theme.text }]}>Nothing is booked yet.</Text>
            <Text style={[styles.safetyCopy, { color: theme.textMuted }]}>You'll review and confirm everything in the regular booking flow before any order is placed.</Text>
          </View>
        </View>

        {reviewError ? (
          <View style={[styles.errorBox, { backgroundColor: isDark ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.05)", borderColor: isDark ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.2)" }]}>
            <MaterialIcons name="error-outline" size={18} color={isDark ? "#F87171" : "#DC2626"} />
            <Text style={[styles.errorText, { color: isDark ? "#F87171" : "#DC2626" }]}>{reviewError}</Text>
          </View>
        ) : null}

        <TouchableOpacity accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={continueToBooking}>
          <Text style={styles.primaryButtonText}>Continue to Booking →</Text>
        </TouchableOpacity>
        
        <TouchableOpacity accessibilityRole="button" style={[styles.secondaryButton, { borderColor: glassBorder, backgroundColor: glassBg }]} onPress={discardAiDraft}>
          <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Discard draft & start over</Text>
        </TouchableOpacity>
        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, height: 56 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  subtitle: { fontSize: 15, textAlign: "center", marginBottom: 20, paddingHorizontal: 16, lineHeight: 22 },
  
  card: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 20 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countBadgeText: { fontSize: 12, fontWeight: "700" },
  
  copy: { fontSize: 14, lineHeight: 20 },
  
  itemRow: { paddingVertical: 16 },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  itemLabel: { fontSize: 16, fontWeight: "700", flex: 1 },
  manualBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  manualBadgeText: { fontSize: 11, fontWeight: "700" },
  confidence: { fontSize: 12, marginBottom: 8 },
  mappedText: { fontSize: 14, fontWeight: "600", flex: 1 },
  unmappedText: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  
  itemControlsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  quantityControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  quantityBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  quantityValue: { fontSize: 15, fontWeight: "700", minWidth: 20, textAlign: "center" },
  
  removeText: { fontSize: 13, fontWeight: "600" },
  restoreText: { fontSize: 13, fontWeight: "600" },
  
  addItemButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  addItemText: { fontSize: 14, fontWeight: "600" },
  
  manualItemsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  manualItemChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  manualItemText: { fontSize: 13, fontWeight: "500" },
  
  preferenceRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 12 },
  preferenceIcon: { width: 24, alignItems: "center" },
  preferenceContent: { flex: 1 },
  preferenceLabel: { fontSize: 12, marginBottom: 2 },
  preferenceValue: { fontSize: 15, fontWeight: "600" },
  
  noteBox: { padding: 12, borderRadius: 12, borderWidth: 1 },
  noteText: { fontSize: 14, lineHeight: 20 },
  
  warningText: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
  
  safetyCard: { flexDirection: "row", gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24, alignItems: "center" },
  safetyTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  safetyCopy: { fontSize: 13, lineHeight: 18 },
  
  errorBox: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20, alignItems: "center" },
  errorText: { fontSize: 14, fontWeight: "600", flex: 1 },

  primaryButton: { minHeight: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  
  secondaryButton: { minHeight: 50, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { fontSize: 15, fontWeight: "600" },
});
