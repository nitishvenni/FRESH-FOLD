import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "../components/Card";
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
  const { theme } = useAppTheme();
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

  useEffect(() => {
    setReviewItems(initialItems);
    initialItemsRef.current = initialItems;
    setAcceptedCleaningService(defaultSelections.cleaningService);
    setAcceptedSpeed(defaultSelections.speed);
    setAcceptedPickupDate(defaultSelections.pickupDate);
    setAcceptedPickupSlot(defaultSelections.pickupSlot);
    setReviewError(null);
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

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 18 }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <TouchableOpacity accessibilityRole="button" style={styles.back} onPress={() => router.replace("/ai-booking" as never)}><MaterialIcons name="arrow-back" size={22} color={theme.text} /><Text style={[styles.backText, { color: theme.text }]}>Describe booking</Text></TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Review booking draft</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Review and edit suggestions before opening the regular booking flow.</Text>

        {!result ? <Card style={[styles.card, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}><Text style={[styles.cardTitle, { color: theme.text }]}>Draft unavailable</Text><Text style={[styles.copy, { color: theme.textMuted }]}>Try again or continue with Manual Booking.</Text></Card> : <>
          <Card style={[styles.card, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Items</Text>
            {reviewItems.length === 0 ? <Text style={[styles.copy, { color: theme.textMuted }]}>No supported items were extracted automatically.</Text> : reviewItems.map((item) => {
              const isManual = item.id.startsWith("manual:");
              const mappedName = item.catalogItemId ? allItems.find((catalogItem) => catalogItem.key === item.catalogItemId)?.name : null;
              return <View key={item.id} style={styles.item}>
                <View style={styles.itemHeader}><Text style={[styles.itemLabel, { color: theme.text }]}>{item.detectedLabel}</Text>{isManual ? <Text style={[styles.badge, { color: theme.success }]}>Manually added</Text> : null}</View>
                {!isManual ? <Text style={[styles.copy, { color: theme.textMuted }]}>Confidence: {Math.round(item.confidence * 100)}% (advisory)</Text> : null}
                {mappedName ? <><Text style={[styles.mapped, { color: theme.success }]}>Catalog match: {mappedName}</Text>{item.removed ? <Text style={[styles.copy, { color: theme.textMuted }]}>Removed from prefill</Text> : <View style={styles.controls}><TouchableOpacity accessibilityRole="button" onPress={() => changeQuantity(item.id, -1)} style={[styles.circleButton, { borderColor: theme.border }]}><MaterialIcons name="remove" size={18} color={theme.text} /></TouchableOpacity><Text style={[styles.quantity, { color: theme.text }]}>Quantity: {item.quantity ?? "Choose"}</Text><TouchableOpacity accessibilityRole="button" onPress={() => changeQuantity(item.id, 1)} style={[styles.circleButton, { borderColor: theme.border }]}><MaterialIcons name="add" size={18} color={theme.text} /></TouchableOpacity><TouchableOpacity accessibilityRole="button" onPress={() => setReviewItems((items) => removeReviewItem(items, item.id))}><Text style={[styles.remove, { color: theme.warning }]}>Remove</Text></TouchableOpacity></View>}</> : <Text style={[styles.unmapped, { color: theme.warning }]}>Not in the current catalog and cannot be added automatically</Text>}
              </View>;
            })}
            <TouchableOpacity accessibilityRole="button" style={[styles.secondaryButton, { borderColor: theme.border }]} onPress={() => setShowManualItems((value) => !value)}><Text style={[styles.secondaryButtonText, { color: theme.text }]}>Add supported item manually</Text></TouchableOpacity>
            {showManualItems ? <View style={styles.manualItems}>{allItems.map((item) => <TouchableOpacity key={item.key} accessibilityRole="button" onPress={() => addManualItem(item.key)} style={[styles.manualItem, { borderColor: theme.border }]}><Text style={[styles.copy, { color: theme.text }]}>{item.name}</Text></TouchableOpacity>)}</View> : null}
          </Card>

          <Card style={[styles.card, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Booking suggestions</Text>
            {result.cleaningService ? <><Text style={[styles.copy, { color: theme.textMuted }]}>Cleaning service</Text><TouchableOpacity accessibilityRole="button" onPress={() => setAcceptedCleaningService(acceptedCleaningService === result.cleaningService ? undefined : result.cleaningService || undefined)}><Text style={[acceptedCleaningService === result.cleaningService ? styles.accept : styles.copy, { color: acceptedCleaningService === result.cleaningService ? theme.success : theme.textMuted }]}>{acceptedCleaningService === result.cleaningService ? `✓ ${cleaningLabel[result.cleaningService]} · Detected from your request` : cleaningLabel[result.cleaningService]}</Text></TouchableOpacity></> : <Text style={[styles.copy, { color: theme.textMuted }]}>No cleaning service could be confirmed. Choose one in booking.</Text>}
            {result.speed ? <><Text style={[styles.copy, { color: theme.textMuted }]}>Speed</Text><TouchableOpacity accessibilityRole="button" onPress={() => setAcceptedSpeed(acceptedSpeed === result.speed ? undefined : result.speed || undefined)}><Text style={[acceptedSpeed === result.speed ? styles.accept : styles.copy, { color: acceptedSpeed === result.speed ? theme.success : theme.textMuted }]}>{acceptedSpeed === result.speed ? `✓ ${speedLabel[result.speed]} · Detected from your request` : speedLabel[result.speed]}</Text></TouchableOpacity></> : <Text style={[styles.copy, { color: theme.textMuted }]}>No speed could be confirmed. Choose one in booking.</Text>}
          </Card>

          <Card style={[styles.card, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Scheduling suggestions</Text>
            <Text style={[styles.copy, { color: theme.textMuted }]}>Detected from your request. You can change and confirm both in the regular scheduling step.</Text>
            {result.pickupDate ? <><Text style={[styles.copy, { color: theme.textMuted }]}>Pickup date</Text><TouchableOpacity accessibilityRole="button" onPress={() => setAcceptedPickupDate(acceptedPickupDate === result.pickupDate ? undefined : result.pickupDate ?? undefined)}><Text style={[acceptedPickupDate === result.pickupDate ? styles.accept : styles.copy, { color: acceptedPickupDate === result.pickupDate ? theme.success : theme.textMuted }]}>{acceptedPickupDate === result.pickupDate ? `✓ ${(getRelativeBookingDateLabel(result.pickupDate) ?? "Pickup date")} · ${formatBookingDate(result.pickupDate)}` : formatBookingDate(result.pickupDate)}</Text></TouchableOpacity></> : null}
            {result.pickupSlot ? <><Text style={[styles.copy, { color: theme.textMuted }]}>Pickup time</Text><TouchableOpacity accessibilityRole="button" onPress={() => setAcceptedPickupSlot(acceptedPickupSlot === result.pickupSlot ? undefined : result.pickupSlot ?? undefined)}><Text style={[acceptedPickupSlot === result.pickupSlot ? styles.accept : styles.copy, { color: acceptedPickupSlot === result.pickupSlot ? theme.success : theme.textMuted }]}>{acceptedPickupSlot === result.pickupSlot ? `✓ ${result.pickupSlot}` : result.pickupSlot}</Text></TouchableOpacity></> : null}
            {!result.pickupDate && !result.pickupSlot ? <Text style={[styles.copy, { color: theme.textMuted }]}>No exact date or time could be safely confirmed. Choose them in booking.</Text> : null}
            {result.pickupPreference ? <Text style={[styles.note, { color: theme.text }]}>Preference: {result.pickupPreference}</Text> : null}
          </Card>

          {result.specialInstructions ? <Card style={[styles.card, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}><Text style={[styles.cardTitle, { color: theme.text }]}>Review-only note</Text><Text style={[styles.copy, { color: theme.textMuted }]}>This note is not sent to order creation or payment.</Text><Text style={[styles.note, { color: theme.text }]}>{result.specialInstructions}</Text></Card> : null}
          {result.unresolvedFields.length > 0 || result.warnings.length > 0 ? <Card style={[styles.card, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}><Text style={[styles.cardTitle, { color: theme.text }]}>Needs review</Text>{result.unresolvedFields.map((field) => <Text key={field} style={[styles.copy, { color: theme.warning }]}>• {formatUnresolvedField(field)}</Text>)}{result.warnings.map((warning, index) => <Text key={`${warning}-${index}`} style={[styles.copy, { color: theme.textMuted }]}>• {formatWarning(warning)}</Text>)}</Card> : null}
        </>}

        {reviewError ? <Text style={[styles.error, { color: theme.warning }]}>{reviewError}</Text> : null}
        <TouchableOpacity accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={continueToBooking}><Text style={styles.primaryButtonText}>Review and Continue to Booking</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={[styles.secondaryButton, { borderColor: theme.border }]} onPress={() => router.replace("/ai-booking" as never)}><Text style={[styles.secondaryButtonText, { color: theme.text }]}>Edit request</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: 20 }, back: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", minHeight: 40 }, backText: { marginLeft: 6, fontSize: 15, fontWeight: "600" }, title: { marginTop: 18, fontSize: 30, fontWeight: "700" }, subtitle: { marginTop: 8, fontSize: 15, lineHeight: 22 },
  card: { marginTop: 16 }, cardTitle: { fontSize: 16, fontWeight: "700" }, copy: { marginTop: 8, fontSize: 14, lineHeight: 20 }, item: { marginTop: 16 }, itemHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 }, itemLabel: { flex: 1, fontSize: 16, fontWeight: "700" }, badge: { fontSize: 12, fontWeight: "700" }, mapped: { marginTop: 8, fontSize: 14, fontWeight: "700" }, unmapped: { marginTop: 8, fontSize: 14, fontWeight: "700" }, controls: { marginTop: 12, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 }, circleButton: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" }, quantity: { fontSize: 14, fontWeight: "700" }, remove: { marginTop: 10, fontSize: 14, fontWeight: "700" }, accept: { marginTop: 10, fontSize: 14, fontWeight: "700" },
  secondaryButton: { minHeight: 48, marginTop: 16, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 }, secondaryButtonText: { fontSize: 14, fontWeight: "700" }, manualItems: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }, manualItem: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 }, note: { marginTop: 8, fontSize: 14, lineHeight: 20 }, error: { marginTop: 20, fontSize: 14, lineHeight: 20, textAlign: "center" }, primaryButton: { minHeight: 54, marginTop: 28, borderRadius: 16, alignItems: "center", justifyContent: "center" }, primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
