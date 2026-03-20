import { MaterialIcons } from "@expo/vector-icons";
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
import Card from "../components/Card";
import OrderTimeline from "../components/OrderTimeline";
import TrackOrderSkeleton from "../components/TrackOrderSkeleton";
import { useAppTheme } from "../hooks/useAppTheme";
import { apiRequest } from "../utils/api";
import { handleError } from "../utils/errorHandler";
import { triggerImpactHaptic } from "../utils/haptics";
import { notifyOrderStatusUpdate } from "../utils/notifications";
import { orderSocket } from "../utils/socket";
import { showToast } from "../utils/toast";

type Order = {
  _id: string;
  status: string;
};

const steps = [
  "Scheduled",
  "Received at Facility",
  "Picked Up",
  "Washing",
  "Ironing",
  "Out for Delivery",
  "Delivered",
];

export default function TrackOrder() {
  const router = useRouter();
  const { orderId, status } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
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
    const handleOrderUpdated = (updatedOrder: Order) => {
      if (updatedOrder?._id === orderId) {
        setOrder(updatedOrder);
      }
    };

    const handleOrdersUpdated = () => {
      void fetchOrder();
    };

    orderSocket.connect();
    orderSocket.on("orderUpdated", handleOrderUpdated);
    orderSocket.on("ordersUpdated", handleOrdersUpdated);

    return () => {
      orderSocket.off("orderUpdated", handleOrderUpdated);
      orderSocket.off("ordersUpdated", handleOrdersUpdated);
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
      </View>
    );
  }

  const currentStepIndex = steps.indexOf(order.status);

  return (
	      <ScrollView
	        style={[styles.container, { backgroundColor: theme.background }]}
	        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 }}
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
      <Text style={[styles.header, { color: theme.text }]}>Track Order</Text>
      <Text style={[styles.subheader, { color: theme.textMuted }]}>
        Follow your laundry progress from pickup to doorstep delivery.
      </Text>

      <Card style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.heroRow}>
          <View style={[styles.heroIcon, { backgroundColor: theme.primarySoft }]}>
            <MaterialIcons name="local-laundry-service" size={22} color={theme.primary} />
          </View>
          <View>
            <Text style={[styles.orderLabel, { color: theme.textMuted }]}>Order ID</Text>
            <Text style={[styles.orderValue, { color: theme.text }]}>#{order._id.slice(-6)}</Text>
          </View>
        </View>
        <Text style={[styles.statusTitle, { color: theme.text }]}>Current status: {order.status}</Text>
      </Card>

      <Card style={[styles.timelineCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.timelineHeading, { color: theme.text }]}>Order Timeline</Text>
        <OrderTimeline steps={steps} currentStep={Math.max(currentStepIndex, 0)} />
      </Card>

      <Card style={[styles.statusCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.statusLabel, { color: theme.textMuted }]}>Current Status</Text>
        <Text style={[styles.statusValue, { color: theme.text }]}>{order.status}</Text>
      </Card>

      <Card style={[styles.supportCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.supportTitle, { color: theme.text }]}>Need Help?</Text>
        <Text style={[styles.supportCopy, { color: theme.textMuted }]}>
          Contact support for pickup changes, delivery updates, or special garment instructions.
        </Text>
        <TouchableOpacity
          style={[styles.supportButton, { backgroundColor: theme.primarySoft }]}
          activeOpacity={0.9}
          onPress={() => {
            void triggerImpactHaptic();
            router.push("/support");
          }}
        >
          <Text style={[styles.supportButtonText, { color: theme.primary }]}>Contact Support</Text>
        </TouchableOpacity>
      </Card>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.text }]}
        activeOpacity={0.9}
        onPress={() => {
          void triggerImpactHaptic();
          router.replace("/home");
        }}
      >
        <Text style={[styles.buttonText, { color: theme.surface }]}>Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subheader: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },
  heroCard: {
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  orderLabel: {
    fontSize: 13,
    marginBottom: 3,
  },
  orderValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  timelineCard: {
    marginBottom: 14,
  },
  timelineHeading: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 18,
  },
  statusCard: {
    marginBottom: 14,
  },
  statusLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  supportCard: {
    marginBottom: 6,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  supportCopy: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  supportButton: {
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  button: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
