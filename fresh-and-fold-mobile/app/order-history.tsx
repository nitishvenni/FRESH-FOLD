import {
  RefreshControl,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EmptyStateAnimation from "../components/EmptyStateAnimation";
import OrderSkeleton from "../components/OrderSkeleton";
import { handleError } from "../utils/errorHandler";
import { useAppTheme } from "../hooks/useAppTheme";
import { APP_TAB_BAR_HEIGHT } from "../components/AppTabBar";
import { triggerImpactHaptic } from "../utils/haptics";
import OrderCard from "../components/OrderCard";
import useOrders from "../hooks/useOrders";
import { formatDate } from "../utils/formatDate";
import { showToast } from "../utils/toast";

type FilterTab = "All" | "Active" | "Completed";

const buildReorderItems = (
  items: Array<{
    itemName: string;
    quantity: number;
  }> = []
) =>
  items.reduce<Record<string, number>>((acc, item) => {
    const key = String(item.itemName || "").trim().toLowerCase();
    const quantity = Number(item.quantity) || 0;

    if (!key || quantity <= 0) {
      return acc;
    }

    acc[key] = quantity;
    return acc;
  }, {});

export default function OrderHistory() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { orders, loading, error, refresh } = useOrders();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("All");

  useEffect(() => {
    if (error) {
      handleError(error);
    }
  }, [error]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await refresh();
      showToast({
        type: "success",
        title: "Orders refreshed",
      });
    } catch (refreshError) {
      handleError(refreshError);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const isCompleted = (order.status || "").toLowerCase() === "delivered";
      if (activeTab === "Active") return !isCompleted;
      if (activeTab === "Completed") return isCompleted;
      return true; // All
    });
  }, [orders, activeTab]);

  if (loading) {
    return <OrderSkeleton />;
  }

  const renderEmptyState = () => {
    let title = "No Orders Yet";
    let subtitle = "Your completed and active laundry orders will show up here once you place one.";
    
    if (activeTab === "Active") {
      title = "No Active Orders";
      subtitle = "You don't have any laundry orders currently in progress.";
    } else if (activeTab === "Completed") {
      title = "No Completed Orders";
      subtitle = "Your historical delivered orders will appear here.";
    }

    return (
      <View style={styles.emptyContainer}>
        <EmptyStateAnimation />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.emptyCopy, { color: theme.textMuted }]}>{subtitle}</Text>
        <TouchableOpacity 
          style={[styles.emptyButton, { backgroundColor: theme.primary }]}
          activeOpacity={0.9}
          onPress={() => {
            void triggerImpactHaptic();
            router.push("/select-service");
          }}
        >
          <Text style={styles.emptyButtonText}>Start a Booking</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Background Glow */}
      <View
        style={[
          styles.backgroundGlowTop,
          { backgroundColor: theme.primarySoft, opacity: isDark ? 0.15 : 0.6 },
        ]}
      />
      
      <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.header, { color: theme.text }]}>My Orders</Text>
        <Text style={[styles.subheader, { color: theme.textMuted }]}>Track and manage your laundry orders.</Text>
        
        {/* Segmented Filter Control */}
        <View style={[styles.tabContainer, { backgroundColor: isDark ? "rgba(17,24,39,0.6)" : "rgba(255,255,255,0.7)", borderColor: theme.border }]}>
          {(["All", "Active", "Completed"] as FilterTab[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                activeOpacity={0.8}
                onPress={() => {
                  void triggerImpactHaptic();
                  setActiveTab(tab);
                }}
                style={[
                  styles.tabButton,
                  isActive && { backgroundColor: theme.primary },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: isActive ? "#FFFFFF" : theme.textMuted },
                    isActive && styles.tabTextActive
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: APP_TAB_BAR_HEIGHT + insets.bottom + 32 }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void onRefresh();
            }}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        renderItem={({ item }) => (
          <OrderCard
            order={{
              id: item._id.slice(-6).toUpperCase(),
              status: item.status,
              total: item.totalAmount || 0,
              dateLabel: formatDate(item.createdAt),
            }}
            onTrack={() => {
              void triggerImpactHaptic();
              router.push({
                pathname: "/track-order",
                params: { orderId: item._id, status: item.status },
              });
            }}
            onReorder={() => {
              void triggerImpactHaptic();

              const reorderItems = buildReorderItems(item.items);

              const legacyCleaningService = item.service === "wash" || item.service === "dry" ? item.service : undefined;
              const cleaningService = item.cleaningService || legacyCleaningService;
              const speed = item.speed || (legacyCleaningService ? "standard" : undefined);
              if (!cleaningService || !speed || Object.keys(reorderItems).length === 0) {
                showToast({
                  type: "error",
                  title: "Reorder unavailable",
                  message: "This order is missing some details. Please create a fresh order.",
                });
                return;
              }

              // SAFE REORDER FLOW:
              // Extract canonical service dimensions and items ONLY.
              // Push to /schedule-basic to force the user to pick a new, valid date/time.
              // This strictly prevents booking expired slots and ensures current pricing.
              router.push({
                pathname: "/schedule-basic",
                params: {
                  cleaningService,
                  speed,
                  items: JSON.stringify(reorderItems),
                },
              });
            }}
          />
        )}
      />
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
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 6,
  },
  subheader: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 16,
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
