import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import OrderSkeleton from "../components/OrderSkeleton";
import { MaterialIcons } from "@expo/vector-icons";
import ActiveOrderCard from "../components/ActiveOrderCard";
import Card from "../components/Card";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../hooks/useAppTheme";
import { getOrders, OrderRecord } from "../services/orderService";

const ACTIVE_ORDER_CACHE_KEY = "activeOrderCache";

type Order = Pick<OrderRecord, "_id" | "status">;

const services = [
  {
    title: "Wash",
    description: "Daily laundry",
    icon: "local-laundry-service" as const,
  },
  {
    title: "Dry Clean",
    description: "Fabric-safe care",
    icon: "dry-cleaning" as const,
  },
  {
    title: "Express",
    description: "Fast turnaround",
    icon: "bolt" as const,
  },
  {
    title: "Bundle",
    description: "Family packs",
    icon: "inventory-2" as const,
  },
];

export default function HomeScreen() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCachedActiveOrder();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  const loadCachedActiveOrder = async () => {
    try {
      const cached = await AsyncStorage.getItem(ACTIVE_ORDER_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as Order;
        if (parsed && parsed.status && parsed.status !== "Delivered") {
          setActiveOrder(parsed);
        }
      }
    } catch {
      // Ignore cache parse errors and continue normal flow.
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const orders = await getOrders();
      const firstActive = orders.find(
        (order) => order.status !== "Delivered"
      );

      if (firstActive) {
        setActiveOrder(firstActive);
        await AsyncStorage.setItem(
          ACTIVE_ORDER_CACHE_KEY,
          JSON.stringify(firstActive)
        );
      } else {
        setActiveOrder(null);
        await AsyncStorage.removeItem(ACTIVE_ORDER_CACHE_KEY);
      }
    } catch {
      // Keep cached active order if network/backend is down.
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: 154 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.backgroundGlowTop, { backgroundColor: theme.primarySoft, opacity: isDark ? 0.22 : 0.95 }]} />
        <View style={[styles.backgroundGlowBottom, { backgroundColor: theme.primarySoft, opacity: isDark ? 0.14 : 0.35 }]} />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Text style={[styles.brand, { color: theme.text }]}>Fresh & Fold</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Premium Laundry Care</Text>
        </View>

        <Pressable
          style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}
          onPress={() => router.push("/select-service")}
        >
          <MaterialIcons name="search" size={20} color={theme.textMuted} />
          <Text style={[styles.searchText, { color: theme.textMuted }]}>Search services or items</Text>
        </Pressable>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Our Services</Text>
          <View style={styles.servicesGrid}>
            {services.map((service) => (
              <TouchableOpacity
                key={service.title}
                style={[
                  styles.serviceCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    shadowColor: theme.shadow,
                  },
                ]}
                activeOpacity={0.88}
                onPress={() => router.push("/select-service")}
              >
                <View
                  style={[
                    styles.serviceIconWrap,
                    { backgroundColor: theme.primarySoft },
                  ]}
                >
                  <MaterialIcons name={service.icon} size={26} color={theme.primary} />
                </View>
                <Text style={[styles.serviceTitle, { color: theme.text }]}>{service.title}</Text>
                <Text style={[styles.serviceDescription, { color: theme.textMuted }]}>{service.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Active Order</Text>
            {activeOrder ? (
              <Text style={[styles.sectionLink, { color: theme.primary }]} onPress={() => router.push("/order-history")}>
                View all
              </Text>
            ) : null}
          </View>
          {loading ? (
            <OrderSkeleton count={1} compact />
          ) : (
            <ActiveOrderCard
              order={activeOrder}
              onSchedulePickup={() => router.push("/select-service")}
              onTrackOrder={() =>
                router.push({
                  pathname: "/track-order",
                  params: { orderId: activeOrder?._id || "" },
                })
              }
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Special Offers</Text>
          <View
            style={[
              styles.offerCard,
              { shadowColor: isDark ? theme.shadow : "#1D4ED8" },
            ]}
          >
            <View>
              <Text style={styles.offerEyebrow}>Limited time</Text>
              <Text style={styles.offerTitle}>50% OFF</Text>
              <Text style={styles.offerSub}>Your first order with Fresh & Fold</Text>
            </View>
            <View style={styles.offerBadge}>
              <MaterialIcons name="local-offer" size={18} color="#1D4ED8" />
              <Text style={styles.offerBadgeText}>FIRST50</Text>
            </View>
          </View>

          <Card style={styles.secondaryOfferCard}>
            <View style={styles.secondaryOfferHeader}>
              <View
                style={[
                  styles.secondaryOfferIcon,
                  { backgroundColor: isDark ? theme.surfaceAlt : "#ECFDF5" },
                ]}
              >
                <MaterialIcons name="flash-on" size={18} color="#0F766E" />
              </View>
              <Text style={[styles.secondaryOfferTitle, { color: theme.text }]}>Express delivery slots</Text>
            </View>
            <Text style={[styles.secondaryOfferText, { color: theme.textMuted }]}>
              Need garments back quickly? Priority slots are available for urgent pickups.
            </Text>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -90,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: 140,
    left: -80,
    width: 210,
    height: 210,
    borderRadius: 105,
  },
  header: {
    marginBottom: 22,
  },
  brand: {
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
  },
  searchBar: {
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 26,
  },
  searchText: {
    marginLeft: 10,
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: "700",
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  serviceCard: {
    width: "47.5%",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  serviceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
  },
  offerCard: {
    borderRadius: 24,
    padding: 22,
    minHeight: 170,
    justifyContent: "space-between",
    backgroundColor: "#2563EB",
    shadowColor: "#1D4ED8",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  offerEyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  offerTitle: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 6,
  },
  offerSub: {
    color: "#DBEAFE",
    fontSize: 15,
    lineHeight: 21,
  },
  offerBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  offerBadgeText: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 6,
  },
  secondaryOfferCard: {
    marginTop: 14,
  },
  secondaryOfferHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  secondaryOfferIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  secondaryOfferTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  secondaryOfferText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
  },
});
