import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CategoryChips, { Category } from "../components/CategoryChips";
import HorizontalServiceCard from "../components/HorizontalServiceCard";
import ItemCard from "../components/ItemCard";
import ServiceModeSelector from "../components/ServiceModeSelector";
import { useAppTheme } from "../hooks/useAppTheme";
import { allItems, clothingItems, homeItems, initialItems, ItemKey } from "../utils/bookingData";
import { hydrateSmartScanBookingPrefill, shouldApplySmartScanPrefill } from "../utils/aiBookingDraft";
import { triggerImpactHaptic } from "../utils/haptics";
import { calculateSubtotal, getItemPriceForService } from "../utils/pricing";

type ServiceType = "wash" | "dry";
type ServiceSpeed = "standard" | "express";

const SERVICE_OPTIONS = [
  {
    id: "wash" as ServiceType,
    title: "Wash & Iron",
    description: "Clean wash with perfect iron",
    icon: "local-laundry-service" as const,
    imageSource: require("../assets/images/services/wash.jpg"),
  },
  {
    id: "dry" as ServiceType,
    title: "Dry Clean",
    description: "Gentle care for delicate fabrics",
    icon: "dry-cleaning" as const,
    imageSource: require("../assets/images/services/dry.jpg"),
  },
];

export default function SelectService() {
  const router = useRouter();
  const params = useLocalSearchParams<{ aiPrefill?: string }>();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();

  const [selectedSpeed, setSelectedSpeed] = useState<ServiceSpeed>("standard");
  const [selectedType, setSelectedType] = useState<ServiceType>("wash");
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [items, setItems] = useState(initialItems);
  const appliedPrefillRouteValue = useRef<string | null>(null);
  const hydratedPrefill = useMemo(
    () => hydrateSmartScanBookingPrefill(params.aiPrefill),
    [params.aiPrefill]
  );

  useEffect(() => {
    if (
      hydratedPrefill &&
      shouldApplySmartScanPrefill(
        appliedPrefillRouteValue.current,
        params.aiPrefill,
        hydratedPrefill
      )
    ) {
      setItems(hydratedPrefill);
      appliedPrefillRouteValue.current = params.aiPrefill;
    }
  }, [hydratedPrefill, params.aiPrefill]);

  // Compute downstream service identifier based on speed toggle to respect backend contract.
  const downstreamService = selectedSpeed === "express" ? "express" : selectedType;

  // Compute totals using the existing pricing logic
  const totalItems = useMemo(
    () => Object.values(items).reduce((sum, qty) => sum + qty, 0),
    [items]
  );
  
  const totalAmount = useMemo(
    () => calculateSubtotal(items, downstreamService),
    [items, downstreamService]
  );

  const updateQty = (key: ItemKey, delta: number) => {
    setItems((prev) => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta),
    }));
  };

  const handleContinue = () => {
    void triggerImpactHaptic();
    router.push({
      pathname: "/schedule-basic",
      params: {
        service: downstreamService,
        items: JSON.stringify(items),
        total: totalAmount,
      },
    });
  };

  const visibleItems = useMemo(() => {
    if (selectedCategory === "clothing") return clothingItems;
    if (selectedCategory === "home") return homeItems;
    return allItems;
  }, [selectedCategory]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Background Ambience */}
      <View
        style={[
          styles.backgroundGlowTop,
          { backgroundColor: theme.primarySoft, opacity: isDark ? 0.15 : 0.6 },
        ]}
      />
      
      {/* Custom Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top, paddingHorizontal: 20 },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>New Booking</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ServiceModeSelector selected={selectedSpeed} onChange={setSelectedSpeed} />

      {/* Main Content */}
      <View style={{ flex: 1, overflow: "hidden" }}>
        <ScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + 110,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Choose Service</Text>
            {SERVICE_OPTIONS.map((svc) => (
              <HorizontalServiceCard
                key={svc.id}
                id={svc.id}
                title={svc.title}
                description={svc.description}
                basePrice={getItemPriceForService("shirt", svc.id)}
                icon={svc.icon}
                imageSource={svc.imageSource}
                selected={selectedType === svc.id}
                onPress={() => setSelectedType(svc.id)}
              />
            ))}
          </View>

          <View style={[styles.section, styles.itemsSection]}>
            <View style={styles.itemsHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Items</Text>
                <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
                  Add items you want to clean
                </Text>
              </View>
              {/* Optional price list button could go here */}
            </View>

            <CategoryChips selected={selectedCategory} onSelect={setSelectedCategory} />

            <View style={styles.itemsList}>
              {visibleItems.map((item, index) => (
                <ItemCard
                  key={item.key}
                  item={{
                    ...item,
                    price: getItemPriceForService(item.key, downstreamService),
                  }}
                  quantity={items[item.key]}
                  onAdd={() => updateQty(item.key, 1)}
                  onRemove={() => updateQty(item.key, -1)}
                  index={index}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Floating Bottom Summary */}
      <View style={[styles.bottomBarWrap, { paddingBottom: insets.bottom || 20 }]}>
        <BlurView
          intensity={isDark ? 26 : 40}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={[
            styles.bottomBarBorder,
            {
              backgroundColor: isDark ? "rgba(17,24,39,0.5)" : "rgba(255,255,255,0.4)",
              borderTopColor: isDark ? "rgba(148,163,184,0.15)" : "rgba(255,255,255,0.7)",
            },
          ]}
        >
          <View style={styles.bottomBarContent}>
            <View>
              <Text style={[styles.summaryCount, { color: theme.textMuted }]}>
                {totalItems} {totalItems === 1 ? "Item" : "Items"}
              </Text>
              <Text style={[styles.summaryTotal, { color: theme.text }]}>₹{totalAmount}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleContinue}
              disabled={totalItems === 0}
              style={[
                styles.continueBtn,
                { backgroundColor: theme.primary },
                totalItems === 0 && { opacity: 0.4 },
              ]}
            >
              <Text style={styles.continueText}>Continue</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -100,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  backButtonPlaceholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  itemsSection: {
    paddingHorizontal: 0, 
  },
  itemsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: -8,
  },
  itemsList: {
    paddingHorizontal: 20,
  },
  bottomBarWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  bottomBarBorder: {
    borderTopWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  bottomBarContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryCount: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  summaryTotal: {
    fontSize: 22,
    fontWeight: "700",
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    height: 52,
    borderRadius: 26,
    gap: 8,
  },
  continueText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
