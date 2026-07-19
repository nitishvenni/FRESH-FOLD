import { MaterialIcons, Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SummaryCard from "../components/SummaryCard";
import { useAppTheme } from "../hooks/useAppTheme";
import type { ItemKey } from "../utils/bookingData";
import { apiRequest } from "../utils/api";
import { handleError } from "../utils/errorHandler";
import { triggerImpactHaptic } from "../utils/haptics";
import {
  DELIVERY_CHARGE,
  FREE_DELIVERY_THRESHOLD,
  getNormalizedCleaningService,
  getNormalizedSpeed,
  getItemPriceForService,
  getServiceDisplay,
} from "../utils/pricing";

type PreviewResponse = {
  success: boolean;
  totalAmount: number;
  deliveryCharge: number;
};

const ITEM_LABELS: Record<string, string> = {
  shirt: "Shirt",
  tshirt: "T-Shirt",
  jeans: "Jeans",
  trousers: "Trousers",
  dress: "Dress",
  jacket: "Jacket",
  sweater: "Sweater",
  shorts: "Shorts",
  leggings: "Leggings",
  skirt: "Skirt",
  kurta: "Kurta",
  saree: "Saree",
  hoodie: "Hoodie",
  bedsheet: "Bedsheet",
  pillowcover: "Pillow Cover",
  towel: "Towel",
  curtain: "Curtain",
  blanket: "Blanket",
};

export default function OrderSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { cleaningService: routeCleaningService, speed: routeSpeed, items, date, slot, addressId, addressName } = useLocalSearchParams();
  const cleaningService = getNormalizedCleaningService(routeCleaningService);
  const speed = getNormalizedSpeed(routeSpeed);
  const serviceDisplay = getServiceDisplay(cleaningService, speed);

  const parsedItems = useMemo<Record<string, number>>(
    () => (items ? JSON.parse(items as string) : {}),
    [items]
  );

  const orderItems = useMemo(
    () =>
      Object.keys(parsedItems)
        .filter((key) => Number(parsedItems[key]) > 0)
        .map((key) => ({
          key,
          label: ITEM_LABELS[key] || key,
          quantity: Number(parsedItems[key]),
          price: getItemPriceForService(key as ItemKey, cleaningService, speed),
        })),
    [parsedItems, cleaningService, speed]
  );

  const totalItemsCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = orderItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const fallbackDeliveryCharge = subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_CHARGE : 0;
  const [deliveryCharge, setDeliveryCharge] = useState(fallbackDeliveryCharge);
  const [backendTotal, setBackendTotal] = useState(subtotal + fallbackDeliveryCharge);
  const [pricingRefreshing, setPricingRefreshing] = useState(true);

  useEffect(() => {
    void fetchPreview();
  }, []);

  const fetchPreview = async () => {
    try {
      const data = await Promise.race([
        apiRequest<PreviewResponse>("/orders/preview", {
          method: "POST",
          body: {
            items: orderItems.map((item) => ({
              itemName: item.key,
              quantity: item.quantity,
            })),
            cleaningService,
            speed,
          },
        }),
        new Promise<PreviewResponse>((_, reject) =>
          setTimeout(() => reject(new Error("PREVIEW_TIMEOUT")), 8000)
        ),
      ]);

      setBackendTotal(data.totalAmount);
      setDeliveryCharge(data.deliveryCharge);
    } catch (error) {
      if (!(error instanceof Error && error.message === "PREVIEW_TIMEOUT")) {
        handleError(error);
      }
    } finally {
      setPricingRefreshing(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Subtle Atmospheric Background */}
      <View
        style={[
          styles.backgroundGlowTop,
          { backgroundColor: theme.primarySoft, opacity: isDark ? 0.15 : 0.6 },
        ]}
      />

      {/* Header */}
      <View style={[styles.headerRow, { paddingTop: insets.top, paddingHorizontal: 20 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Order Summary</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 120, // Ensure bottom items are not hidden by CTA
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subheader, { color: theme.textMuted }]}>
          Review your booking before payment.
        </Text>

        <SummaryCard title="Booking Details">
          <View style={styles.serviceRow}>
            <View style={[styles.serviceIconWrap, { backgroundColor: theme.primarySoft }]}>
              <MaterialIcons name="local-laundry-service" size={22} color={theme.primary} />
            </View>
            <View style={styles.serviceTextWrap}>
              <Text style={[styles.serviceName, { color: theme.text }]}>{serviceDisplay.cleaningService}</Text>
              <Text style={[styles.serviceDesc, { color: theme.textMuted }]}>
                {speed === "express" ? "Express turnaround" : "Standard turnaround"}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    speed === "express" ? "rgba(245,158,11,0.15)" : theme.primarySoft,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: speed === "express" ? "#D97706" : theme.primary,
                  },
                ]}
              >
                {serviceDisplay.speed}
              </Text>
            </View>
          </View>
        </SummaryCard>

        <SummaryCard
          title="Items"
          headerRight={
            <Text style={[styles.itemsCount, { color: theme.textMuted }]}>
              {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"}
            </Text>
          }
        >
          {orderItems.map((item, index) => (
            <View
              key={item.key}
              style={[
                styles.itemRow,
                index < orderItems.length - 1 && [styles.rowBorder, { borderBottomColor: theme.border }],
              ]}
            >
              <View style={styles.itemLeft}>
                <Text style={[styles.itemLabel, { color: theme.text }]}>{item.label}</Text>
                <Text style={[styles.itemQty, { color: theme.textMuted }]}>× {item.quantity}</Text>
              </View>
              <Text style={[styles.itemValue, { color: theme.text }]}>
                ₹{item.quantity * item.price}
              </Text>
            </View>
          ))}
        </SummaryCard>

        <SummaryCard title="Pickup">
          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: isDark ? "rgba(148,163,184,0.15)" : "#F1F5F9" }]}>
              <Feather name="calendar" size={16} color={theme.textMuted} />
            </View>
            <View style={styles.infoTextWrap}>
              <Text style={[styles.infoPrimary, { color: theme.text }]}>{date}</Text>
              <Text style={[styles.infoSecondary, { color: theme.textMuted }]}>{slot}</Text>
            </View>
          </View>
          <View style={[styles.infoRow, { marginTop: 12 }]}>
            <View style={[styles.infoIconWrap, { backgroundColor: isDark ? "rgba(148,163,184,0.15)" : "#F1F5F9" }]}>
              <MaterialIcons name="location-pin" size={18} color={theme.textMuted} />
            </View>
            <View style={styles.infoTextWrap}>
              <Text style={[styles.infoPrimary, { color: theme.text }]}>{addressName || "Selected Address"}</Text>
              <Text style={[styles.infoSecondary, { color: theme.textMuted }]} numberOfLines={2}>
                We will pick up from this location.
              </Text>
            </View>
          </View>
        </SummaryCard>

        <SummaryCard title="Delivery">
          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: isDark ? "rgba(148,163,184,0.15)" : "#F1F5F9" }]}>
              <Feather name="truck" size={16} color={theme.textMuted} />
            </View>
            <View style={styles.infoTextWrap}>
              <Text style={[styles.infoPrimary, { color: theme.text }]}>
                {speed === "express" ? "Express Delivery" : "Standard Delivery"}
              </Text>
              <Text style={[styles.infoSecondary, { color: theme.textMuted }]}>
                {speed === "express"
                  ? "Express orders are delivered within 24 hours."
                  : "Doorstep pickup and drop included."}
              </Text>
            </View>
          </View>
        </SummaryCard>

        <SummaryCard title="Price Details">
          {pricingRefreshing ? (
            <Text style={[styles.refreshText, { color: theme.textMuted }]}>Updating final pricing...</Text>
          ) : null}
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: theme.textMuted }]}>Subtotal</Text>
            <Text style={[styles.priceValue, { color: theme.text }]}>₹{subtotal}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: theme.textMuted }]}>Delivery Fee</Text>
            <Text style={[styles.priceValue, { color: theme.text }]}>₹{deliveryCharge}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>Total</Text>
            <Text style={[styles.totalValue, { color: theme.primary }]}>₹{backendTotal}</Text>
          </View>
        </SummaryCard>
      </ScrollView>

      {/* Floating Bottom CTA Container with BlurView */}
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
            <View style={styles.bottomTotalWrap}>
              <Text style={[styles.bottomTotalLabel, { color: theme.textMuted }]}>Total</Text>
              <Text style={[styles.bottomTotalValue, { color: theme.text }]}>₹{backendTotal}</Text>
            </View>
            <TouchableOpacity
              style={[styles.payButton, { backgroundColor: theme.primary }]}
              activeOpacity={0.9}
              onPress={() => {
                void triggerImpactHaptic();
                router.push({
                  pathname: "/payment",
                  params: {
                    cleaningService,
                    speed,
                    items,
                    date,
                    slot,
                    addressId,
                    addressName,
                  },
                });
              }}
            >
              <Text style={styles.payText}>Proceed to Payment</Text>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
    marginBottom: 12,
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
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subheader: {
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  serviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  serviceTextWrap: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  serviceDesc: {
    fontSize: 13,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemsCount: {
    fontSize: 13,
    fontWeight: "600",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemQty: {
    fontSize: 13,
  },
  itemValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoPrimary: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  infoSecondary: {
    fontSize: 13,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 14,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "800",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  refreshText: {
    fontSize: 12,
    marginBottom: 12,
    fontStyle: "italic",
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
    alignItems: "center",
    justifyContent: "space-between",
  },
  bottomTotalWrap: {
    flex: 1,
  },
  bottomTotalLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  bottomTotalValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    paddingHorizontal: 24,
    borderRadius: 26,
    gap: 8,
  },
  payText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
