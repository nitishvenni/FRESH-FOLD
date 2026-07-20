import { MaterialIcons, Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import OrderTimeline from "../components/OrderTimeline";
import TrackOrderSkeleton from "../components/TrackOrderSkeleton";
import { useAppTheme } from "../hooks/useAppTheme";
import { apiRequest } from "../utils/api";
import { handleError } from "../utils/errorHandler";
import { triggerImpactHaptic } from "../utils/haptics";
import { notifyOrderStatusUpdate } from "../utils/notifications";
import { connectAuthenticatedSocket, orderSocket } from "../utils/socket";
import { showToast } from "../utils/toast";

type Order = {
  _id: string;
  status: string;
};

type OrderStatusUpdate = {
  orderId?: string;
  status?: string;
};

// DO NOT CHANGE: Exact backend statuses mapped to timeline
const steps = [
  "Scheduled",
  "Received at Facility",
  "Picked Up",
  "Washing",
  "Ironing",
  "Out for Delivery",
  "Delivered",
];

// Display mappings for Hero
const displayLabels: Record<string, string> = {
  "Scheduled": "Pickup Scheduled",
  "Received at Facility": "Received at Facility",
  "Picked Up": "Order Picked Up",
  "Washing": "Washing in Progress",
  "Ironing": "Ironing in Progress",
  "Out for Delivery": "Out for Delivery",
  "Delivered": "Order Delivered",
};

const displayDescriptions: Record<string, string> = {
  "Scheduled": "Your order has been scheduled successfully.",
  "Received at Facility": "Your clothes have reached our laundry facility.",
  "Picked Up": "Your clothes have been picked up by our partner.",
  "Washing": "We are washing your clothes with premium care.",
  "Ironing": "Your clothes will be pressed to perfection.",
  "Out for Delivery": "Your fresh clothes are on the way to you.",
  "Delivered": "Enjoy your fresh & folded clothes!",
};

export default function TrackOrder() {
  const router = useRouter();
  const { orderId, status } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  
  const [order, setOrder] = useState<Order | null>(
    orderId
      ? {
          _id: String(orderId),
          status: String(status || "Scheduled"),
        }
      : null
  );
  const [loading, setLoading] = useState(!orderId);
  const [refreshing, setRefreshing] = useState(false);
  const previousStatusRef = useRef<string | null>(String(status || "Scheduled"));

  useEffect(() => {
    void fetchOrder();
  }, []);

  useEffect(() => {
    const handleOrderUpdated = (updatedOrder: OrderStatusUpdate) => {
      if (updatedOrder?.orderId === orderId && updatedOrder.status) {
        setOrder({ _id: updatedOrder.orderId, status: updatedOrder.status });
      }
    };

    void connectAuthenticatedSocket(orderSocket);
    orderSocket.on("orderUpdated", handleOrderUpdated);

    return () => {
      orderSocket.off("orderUpdated", handleOrderUpdated);
      orderSocket.disconnect();
    };
  }, [orderId]);

  useEffect(() => {
    if (!order?._id || !order.status) {
      return;
    }

    if (previousStatusRef.current && previousStatusRef.current === order.status) {
      return;
    }

    previousStatusRef.current = order.status;
    showToast({
      type: "info",
      title: "Order updated",
      message: `Current status: ${order.status}`,
    });
    void notifyOrderStatusUpdate(order._id, order.status);
  }, [order?._id, order?.status]);

  const fetchOrder = async () => {
    try {
      const data = await apiRequest<{ success: boolean; orders: Order[] }>("/orders");
      const found = data.orders.find((item) => item._id === orderId);
      setOrder(found || null);
    } catch (error) {
      if (!order) {
        handleError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <TrackOrderSkeleton />;
  }

  if (!order) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Order not found</Text>
        <TouchableOpacity 
          style={{ marginTop: 20 }}
          onPress={() => router.replace("/home")}
        >
          <Text style={{ color: theme.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStepIndex = steps.indexOf(order.status);
  const displayTitle = displayLabels[order.status] || order.status;
  const displaySubtitle = displayDescriptions[order.status] || "We are taking care of your order.";

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Background Atmosphere */}
      <View
        style={[
          styles.backgroundGlowTop,
          { backgroundColor: theme.primarySoft, opacity: isDark ? 0.15 : 0.5 },
        ]}
      />

      {/* Custom Premium Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: isDark ? "rgba(17,24,39,0.5)" : "rgba(255,255,255,0.7)" }]}
          onPress={() => {
            void triggerImpactHaptic();
            router.back();
          }}
        >
          <Feather name="chevron-left" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Track Your Order</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
            Order #{order._id.slice(-6).toUpperCase()}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: isDark ? "rgba(17,24,39,0.5)" : "rgba(255,255,255,0.7)" }]}
          onPress={() => {
            void triggerImpactHaptic();
            router.push("/support");
          }}
        >
          <Feather name="headphones" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void (async () => {
                try {
                  setRefreshing(true);
                  await fetchOrder();
                } finally {
                  setRefreshing(false);
                }
              })();
            }}
            tintColor={theme.primary}
          />
        }
      >
        {/* CURRENT STATUS HERO */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)}>
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: isDark ? "rgba(37,99,235,0.15)" : "rgba(235,242,255,0.8)",
                borderColor: isDark ? "rgba(37,99,235,0.25)" : "rgba(219,234,254,1)",
              },
            ]}
          >
            <View style={styles.heroContent}>
              <Text style={[styles.heroLabel, { color: theme.primary }]}>CURRENT STATUS</Text>
              <Text style={[styles.heroTitle, { color: theme.text }]}>{displayTitle}</Text>
              <Text style={[styles.heroSubtitle, { color: theme.textMuted }]}>{displaySubtitle}</Text>
            </View>
            <View style={styles.heroVisualWrap}>
              <View style={[styles.heroIconCircle, { backgroundColor: theme.primary }]}>
                 <MaterialIcons name="local-laundry-service" size={42} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ORDER TIMELINE */}
        <Animated.View entering={FadeInUp.delay(200).duration(300)}>
          <View style={[styles.timelineCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <OrderTimeline steps={steps} currentStep={Math.max(currentStepIndex, 0)} />
          </View>
        </Animated.View>

        {/* CARE PROMISE CARD */}
        <Animated.View entering={FadeInUp.delay(250).duration(300)}>
          <View style={[styles.promiseCard, { backgroundColor: isDark ? "rgba(17,24,39,0.5)" : "rgba(255,255,255,0.6)", borderColor: theme.border }]}>
            <View style={[styles.promiseIconWrap, { backgroundColor: theme.primarySoft }]}>
              <Feather name="shield" size={24} color={theme.primary} />
            </View>
            <View style={styles.promiseContent}>
              <Text style={[styles.promiseTitle, { color: theme.text }]}>We care for your clothes</Text>
              <Text style={[styles.promiseSubtitle, { color: theme.textMuted }]}>
                Premium detergents, hygienic wash & perfect care every time.
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* COMPACT SUPPORT STRIP */}
        <Animated.View entering={FadeInUp.delay(300).duration(300)}>
          <TouchableOpacity
            style={[styles.supportStrip, { backgroundColor: theme.surface, borderColor: theme.border }]}
            activeOpacity={0.9}
            onPress={() => {
              void triggerImpactHaptic();
              router.push("/support");
            }}
          >
            <View style={styles.supportStripLeft}>
              <Ionicons name="checkmark-done-circle-outline" size={20} color={theme.textMuted} />
              <Text style={[styles.supportStripText, { color: theme.textMuted }]}>Secure. Reliable. Always on time.</Text>
            </View>
            <View style={styles.supportStripRight}>
              <Text style={[styles.supportStripLink, { color: theme.primary }]}>Contact Support</Text>
              <Feather name="chevron-right" size={16} color={theme.primary} />
            </View>
          </TouchableOpacity>
        </Animated.View>
        
        {/* Bottom padding spacing for TabBar if needed */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -100,
    right: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  heroCard: {
    flexDirection: "row",
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  heroContent: {
    flex: 1,
    paddingRight: 16,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  heroVisualWrap: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  timelineCard: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
  },
  promiseCard: {
    flexDirection: "row",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 20,
  },
  promiseIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  promiseContent: {
    flex: 1,
  },
  promiseTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  promiseSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  supportStrip: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },
  supportStripLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  supportStripText: {
    fontSize: 12,
  },
  supportStripRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  supportStripLink: {
    fontSize: 13,
    fontWeight: "700",
  },
});
