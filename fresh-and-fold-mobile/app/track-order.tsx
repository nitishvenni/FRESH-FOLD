import { MaterialIcons, Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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

// CORRECTED Frontend Timeline sequence.
// Do NOT change backend status strings.
const steps = [
  "Scheduled",
  "Picked Up",
  "Received at Facility",
  "Washing",
  "Ironing",
  "Out for Delivery",
  "Delivered",
];

// Display mappings for Hero & Timeline
const displayLabels: Record<string, string> = {
  "scheduled": "Pickup Scheduled",
  "picked up": "Order Picked Up",
  "received at facility": "Received at Facility",
  "washing": "Washing in Progress",
  "ironing": "Ironing in Progress",
  "out for delivery": "Out for Delivery",
  "delivered": "Order Delivered",
};

const displayDescriptions: Record<string, string> = {
  "scheduled": "Your pickup has been scheduled.",
  "picked up": "Your laundry has been picked up.",
  "received at facility": "Your items have reached our facility.",
  "washing": "We're cleaning your clothes with care.",
  "ironing": "Your clothes are being prepared and finished.",
  "out for delivery": "Your order is on its way to you.",
  "delivered": "Your order has been delivered.",
};

const getStepIcon = (normalizedStep: string, color: string, size: number) => {
  switch (normalizedStep) {
    case "scheduled": return <MaterialIcons name="event" size={size} color={color} />;
    case "picked up": return <MaterialIcons name="moped" size={size} color={color} />;
    case "received at facility": return <MaterialIcons name="business" size={size} color={color} />;
    case "washing": return <MaterialIcons name="local-laundry-service" size={size} color={color} />;
    case "ironing": return <MaterialCommunityIcons name="iron" size={size} color={color} />;
    case "out for delivery": return <MaterialIcons name="local-shipping" size={size} color={color} />;
    case "delivered": return <MaterialIcons name="check-circle" size={size} color={color} />;
    default: return <MaterialIcons name="info" size={size} color={color} />;
  }
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
      if (updatedOrder?.orderId === String(orderId) && updatedOrder.status) {
        setOrder({ _id: updatedOrder.orderId, status: updatedOrder.status });
      }
    };

    void connectAuthenticatedSocket(orderSocket);
    orderSocket.on("orderUpdated", handleOrderUpdated);

    return () => {
      orderSocket.off("orderUpdated", handleOrderUpdated);
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

  const normalizedCurrentStatus = order.status.toLowerCase().trim();
  const currentStepIndex = steps.findIndex(s => s.toLowerCase() === normalizedCurrentStatus);
  const safeCurrentStepIndex = currentStepIndex >= 0 ? currentStepIndex : 0;
  
  const displayTitle = displayLabels[normalizedCurrentStatus] || order.status;

  const glassBg = isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(255, 255, 255, 0.7)";
  const glassBorder = isDark ? "rgba(148, 163, 184, 0.15)" : "rgba(148, 163, 184, 0.2)";

  // Semantic status color for hero
  let semanticColor = theme.primary; // default blue
  if (normalizedCurrentStatus === "scheduled") semanticColor = "#F59E0B"; // amber
  if (normalizedCurrentStatus === "delivered") semanticColor = "#10B981"; // green
  if (normalizedCurrentStatus === "out for delivery") semanticColor = "#8B5CF6"; // violet

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Background Atmosphere matching Login & OTP */}
      <View style={[styles.backgroundGlowTop, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(219, 234, 254, 0.6)" }]} />
      <View style={[styles.backgroundGlowBottom, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.08)" : "rgba(219, 234, 254, 0.4)" }]} />
      
      {/* Premium Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: isDark ? "rgba(30, 41, 59, 0.6)" : "rgba(255, 255, 255, 0.8)", borderColor: glassBorder }]}
          onPress={() => {
            void triggerImpactHaptic();
            router.back();
          }}
        >
          <Feather name="chevron-left" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
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
        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Track Order</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
            Follow your laundry progress from pickup to doorstep delivery.
          </Text>
        </View>

        {/* ORDER OVERVIEW CARD */}
        <View style={[styles.overviewCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewLeft}>
              <View style={[styles.overviewIconWrap, { backgroundColor: theme.primary }]}>
                <MaterialIcons name="local-laundry-service" size={22} color="#FFF" />
              </View>
              <View>
                <Text style={[styles.overviewLabel, { color: theme.textMuted }]}>Order ID</Text>
                <Text style={[styles.overviewId, { color: theme.text }]}>#{order._id.slice(-6).toUpperCase()}</Text>
              </View>
            </View>
          </View>
          
          <View style={[styles.overviewDivider, { backgroundColor: glassBorder }]} />
          
          <View style={styles.overviewStatusRow}>
            <Text style={[styles.overviewStatusLabel, { color: theme.textMuted }]}>Current status</Text>
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, { backgroundColor: semanticColor }]} />
              <Text style={[styles.statusText, { color: semanticColor }]}>{displayTitle}</Text>
            </View>
          </View>
        </View>

        {/* TIMELINE */}
        <View style={styles.timelineContainer}>
          <Text style={[styles.timelineTitle, { color: theme.text }]}>Order Timeline</Text>
          
          <View style={[styles.timelineCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            {steps.map((step, index) => {
              const normalizedStep = step.toLowerCase();
              const isCompleted = index < safeCurrentStepIndex;
              const isCurrent = index === safeCurrentStepIndex;
              const isUpcoming = index > safeCurrentStepIndex;
              const isLast = index === steps.length - 1;
              
              const stepDescription = displayDescriptions[normalizedStep] || "";
              
              return (
                <View key={step} style={styles.stepRow}>
                  {/* Left Column: Icon & Connector */}
                  <View style={styles.stepLeft}>
                    <View 
                      style={[
                        styles.stepIconWrap, 
                        isCompleted && { backgroundColor: theme.primary, borderColor: theme.primary },
                        isCurrent && { backgroundColor: theme.primary, borderColor: isDark ? "rgba(59, 130, 246, 0.4)" : "rgba(219, 234, 254, 1)", borderWidth: 4 },
                        isUpcoming && { backgroundColor: isDark ? "rgba(30, 41, 59, 1)" : "rgba(241, 245, 249, 1)", borderColor: glassBorder, borderWidth: 1 }
                      ]}
                    >
                      {isCompleted ? (
                        <MaterialIcons name="check" size={18} color="#FFF" />
                      ) : (
                        <View style={{ opacity: isUpcoming ? 0.4 : 1 }}>
                          {getStepIcon(normalizedStep, isCurrent ? "#FFF" : theme.text, 18)}
                        </View>
                      )}
                    </View>
                    
                    {!isLast && (
                      <View 
                        style={[
                          styles.connector, 
                          { backgroundColor: isCompleted ? theme.primary : glassBorder },
                          isCurrent && { opacity: 0.5 }
                        ]} 
                      />
                    )}
                  </View>
                  
                  {/* Right Column: Text content */}
                  <View style={[styles.stepRight, { opacity: isUpcoming ? 0.6 : 1, paddingBottom: isLast ? 0 : 36 }]}>
                    <View style={styles.stepTitleRow}>
                      <Text style={[styles.stepNumber, { color: theme.primary }]}>{index + 1}</Text>
                      <Text style={[styles.stepTitle, { color: theme.text, fontWeight: isCurrent ? "700" : "600" }]}>{step}</Text>
                    </View>
                    
                    {isCurrent && (
                      <View style={[styles.inProgressBadge, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(209, 250, 229, 1)" }]}>
                        <Text style={[styles.inProgressText, { color: "#10B981" }]}>In progress</Text>
                      </View>
                    )}
                    
                    {isUpcoming && (
                      <View style={[styles.upcomingBadge, { backgroundColor: isDark ? "rgba(51, 65, 85, 0.5)" : "rgba(241, 245, 249, 1)" }]}>
                        <Text style={[styles.upcomingText, { color: theme.textMuted }]}>Upcoming</Text>
                      </View>
                    )}
                    
                    <Text style={[styles.stepDescription, { color: theme.textMuted }]}>
                      {stepDescription}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* BOTTOM SUPPORT CARD */}
        <TouchableOpacity
          style={[styles.supportCard, { backgroundColor: glassBg, borderColor: glassBorder }]}
          activeOpacity={0.9}
          onPress={() => {
            void triggerImpactHaptic();
            router.push("/support");
          }}
        >
          <View style={[styles.supportIconWrap, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(219, 234, 254, 0.6)" }]}>
            <Feather name="shield" size={24} color={theme.primary} />
          </View>
          <View style={styles.supportContent}>
            <Text style={[styles.supportTitle, { color: theme.text }]}>Need help with your order?</Text>
            <Text style={[styles.supportSubtitle, { color: theme.textMuted }]}>
              Contact our support team if you have questions about your laundry.
            </Text>
            <View style={styles.supportLinkRow}>
              <Text style={[styles.supportLink, { color: theme.primary }]}>Contact Support</Text>
              <MaterialIcons name="arrow-forward" size={16} color={theme.primary} />
            </View>
          </View>
        </TouchableOpacity>
        
      </ScrollView>
    </View>
  );
}

import React from "react";

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
    top: -80,
    right: -40,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: -120,
    left: -60,
    width: 360,
    height: 360,
    borderRadius: 180,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    marginBottom: 28,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    paddingRight: 20,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  overviewCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 32,
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  overviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  overviewLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  overviewIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  overviewId: {
    fontSize: 18,
    fontWeight: "700",
  },
  overviewDivider: {
    height: 1,
    width: "100%",
    marginBottom: 16,
  },
  overviewStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overviewStatusLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "700",
  },
  timelineContainer: {
    marginBottom: 32,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  timelineCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 20,
    paddingRight: 24,
  },
  stepRow: {
    flexDirection: "row",
  },
  stepLeft: {
    width: 40,
    alignItems: "center",
    marginRight: 16,
  },
  stepIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  connector: {
    width: 2,
    flex: 1,
    marginVertical: 4,
    zIndex: 1,
  },
  stepRight: {
    flex: 1,
    paddingTop: 6,
  },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.8,
  },
  stepTitle: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  inProgressBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  inProgressText: {
    fontSize: 11,
    fontWeight: "700",
  },
  upcomingBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  upcomingText: {
    fontSize: 11,
    fontWeight: "700",
  },
  stepDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  supportCard: {
    flexDirection: "row",
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: "flex-start",
  },
  supportIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  supportContent: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  supportSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  supportLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  supportLink: {
    fontSize: 14,
    fontWeight: "700",
  },
});
