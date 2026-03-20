import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SummaryCard from "../components/SummaryCard";
import { useAppTheme } from "../hooks/useAppTheme";
import { apiRequest } from "../utils/api";
import { handleError } from "../utils/errorHandler";
import { triggerImpactHaptic } from "../utils/haptics";

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
  bedsheet: "Bedsheet",
  pillowcover: "Pillow Cover",
  towel: "Towel",
  curtain: "Curtain",
  blanket: "Blanket",
};

const ITEM_PRICES: Record<string, number> = {
  shirt: 20,
  tshirt: 18,
  jeans: 40,
  trousers: 35,
  dress: 60,
  jacket: 90,
  sweater: 50,
  bedsheet: 70,
  pillowcover: 20,
  towel: 22,
  curtain: 110,
  blanket: 140,
};

export default function OrderSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { service, items, date, slot, addressId, addressName } = useLocalSearchParams();

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
          price: ITEM_PRICES[key] || 0,
        })),
    [parsedItems]
  );

  const subtotal = orderItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const fallbackDeliveryCharge = subtotal < 299 ? 25 : 0;
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
            service,
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
      <View
        style={[
          styles.backgroundGlowTop,
          { backgroundColor: theme.primarySoft, opacity: isDark ? 0.22 : 0.9 },
        ]}
      />
      <View
        style={[
          styles.backgroundGlowBottom,
          { backgroundColor: theme.primarySoft, opacity: isDark ? 0.14 : 0.5 },
        ]}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.header, { color: theme.text }]}>Order Summary</Text>
        <Text style={[styles.subheader, { color: theme.textMuted }]}>
          Review the final breakdown before you move to secure payment.
        </Text>

        <SummaryCard title="Service">
          <Text style={[styles.primaryValue, { color: theme.text }]}>
            {String(service || "").replace(/^\w/, (char) => char.toUpperCase())}
          </Text>
        </SummaryCard>

        <SummaryCard title="Items">
          {orderItems.map((item) => (
            <View key={item.key} style={styles.row}>
              <Text style={[styles.rowLabel, { color: theme.textMuted }]}>
                {item.label} x {item.quantity}
              </Text>
              <Text style={[styles.rowValue, { color: theme.text }]}>Rs.{item.quantity * item.price}</Text>
            </View>
          ))}
        </SummaryCard>

        <SummaryCard title="Pickup">
          <Text style={[styles.primaryValue, { color: theme.text }]}>
            {date} - {slot}
          </Text>
          <Text style={[styles.secondaryText, { color: theme.textMuted }]}>{addressName}</Text>
        </SummaryCard>

        <SummaryCard title="Delivery">
          <Text style={[styles.primaryValue, { color: theme.text }]}>Standard Delivery</Text>
          <Text style={[styles.secondaryText, { color: theme.textMuted }]}>
            Doorstep pickup and drop included
          </Text>
        </SummaryCard>

        <SummaryCard title="Price Details">
          {pricingRefreshing ? (
            <Text style={[styles.refreshText, { color: theme.textMuted }]}>Updating final pricing...</Text>
          ) : null}
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Subtotal</Text>
            <Text style={[styles.rowValue, { color: theme.text }]}>Rs.{subtotal}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Delivery Fee</Text>
            <Text style={[styles.rowValue, { color: theme.text }]}>Rs.{deliveryCharge}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.row}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>Total</Text>
            <Text style={[styles.totalValue, { color: theme.text }]}>Rs.{backendTotal}</Text>
          </View>
        </SummaryCard>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 18, backgroundColor: theme.glass }]}>
        <TouchableOpacity
          style={[styles.payButton, { backgroundColor: theme.primary }]}
          activeOpacity={0.9}
          onPress={() => {
            void triggerImpactHaptic();
            router.push({
              pathname: "/payment",
              params: {
                service,
                items,
                date,
                slot,
                addressId,
                addressName,
              },
            });
          }}
        >
          <Text style={styles.payText}>Pay Now</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
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
    top: -90,
    right: -36,
    width: 210,
    height: 210,
    borderRadius: 105,
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: 110,
    left: -70,
    width: 190,
    height: 190,
    borderRadius: 95,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subheader: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  refreshText: {
    fontSize: 12,
    marginBottom: 10,
  },
  rowLabel: {
    fontSize: 14,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  primaryValue: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  secondaryText: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  payButton: {
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  payText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
