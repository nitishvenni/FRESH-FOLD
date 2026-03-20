import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Card from "./Card";

type OrderCardProps = {
  order: {
    id: string;
    status: string;
    total: number;
    dateLabel?: string;
  };
  onTrack: () => void;
  onReorder?: () => void;
};

const getStatusColors = (status: string) => {
  if (status === "Delivered") {
    return { bg: "#DCFCE7", text: "#166534" };
  }

  if (status === "Out for Delivery") {
    return { bg: "#DBEAFE", text: "#1D4ED8" };
  }

  return { bg: "#FEF3C7", text: "#92400E" };
};

export default function OrderCard({
  order,
  onTrack,
  onReorder,
}: OrderCardProps) {
  const statusColors = getStatusColors(order.status);

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.orderId}>Order #{order.id}</Text>
        <Text style={styles.price}>Rs.{order.total}</Text>
      </View>

      <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
        <Text style={[styles.badgeText, { color: statusColors.text }]}>{order.status}</Text>
      </View>

      {order.dateLabel ? <Text style={styles.date}>{order.dateLabel}</Text> : null}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.trackButton} activeOpacity={0.9} onPress={onTrack}>
          <Text style={styles.trackText}>Track Order</Text>
        </TouchableOpacity>

        {onReorder ? (
          <TouchableOpacity style={styles.reorderButton} activeOpacity={0.9} onPress={onReorder}>
            <Text style={styles.reorderText}>Reorder</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  orderId: {
    fontWeight: "700",
    fontSize: 16,
    color: "#111827",
  },
  price: {
    fontWeight: "700",
    fontSize: 16,
    color: "#111827",
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  date: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  trackButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  trackText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  reorderButton: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  reorderText: {
    color: "#2563EB",
    fontWeight: "700",
  },
});
