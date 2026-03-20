import {
  RefreshControl,
  View,
  Text,
  StyleSheet,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

export default function OrderHistory() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { orders, loading, error, refresh } = useOrders();
  const [refreshing, setRefreshing] = useState(false);

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

  if (loading) {
    return <OrderSkeleton />;
  }

  if (orders.length === 0) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.background }]}>
        <EmptyStateAnimation />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>No Orders Yet</Text>
        <Text style={[styles.emptyCopy, { color: theme.textMuted }]}>
          Your completed and active laundry orders will show up here once you place one.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + 24 }]}>
      <Text style={[styles.header, { color: theme.text }]}>Order History</Text>

		      <FlatList
		        data={orders}
		        keyExtractor={(item) => item._id}
		        contentContainerStyle={{ paddingBottom: APP_TAB_BAR_HEIGHT + insets.bottom + 32 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  void onRefresh();
                }}
                tintColor={theme.primary}
              />
            }
		        renderItem={({ item }) => (
          <OrderCard
            order={{
	              id: item._id.slice(-6),
	              status: item.status,
	              total: item.totalAmount || 0,
	              dateLabel: formatDate(item.createdAt),
	            }}
            onTrack={() => {
              void triggerImpactHaptic();
              router.push({
                pathname: "/track-order",
                params: { orderId: item._id },
              });
            }}
            onReorder={() => {
              void triggerImpactHaptic();
              router.push("/select-service");
            }}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});
