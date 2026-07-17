import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

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

const getStatusConfig = (status: string, isDark: boolean) => {
  const normalize = (status || "").toLowerCase();

  // Completed
  if (normalize === "delivered") {
    return {
      bg: isDark ? "rgba(34,197,94,0.15)" : "#DCFCE7",
      text: isDark ? "#86EFAC" : "#166534",
      isActive: false,
    };
  }

  // Cancelled (if exists)
  if (normalize === "cancelled") {
    return {
      bg: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2",
      text: isDark ? "#FCA5A5" : "#991B1B",
      isActive: false,
    };
  }

  // Active - Scheduled
  if (normalize === "scheduled") {
    return {
      bg: isDark ? "rgba(245,158,11,0.15)" : "#FEF3C7",
      text: isDark ? "#FCD34D" : "#92400E",
      isActive: true,
    };
  }
  
  // Active - Ironing
  if (normalize === "ironing") {
    return {
      bg: isDark ? "rgba(139,92,246,0.15)" : "#F3E8FF",
      text: isDark ? "#C4B5FD" : "#6B21A8",
      isActive: true,
    };
  }

  // Active - Everything else (Washing, Picked Up, Out for Delivery, etc)
  return {
    bg: isDark ? "rgba(59,130,246,0.15)" : "#DBEAFE",
    text: isDark ? "#93C5FD" : "#1D4ED8",
    isActive: true,
  };
};

export default function OrderCard({
  order,
  onTrack,
  onReorder,
}: OrderCardProps) {
  const { theme, isDark } = useAppTheme();
  const statusConfig = getStatusConfig(order.status, isDark);

  // Active orders get a slight blue overlay
  const cardBg = statusConfig.isActive
    ? (isDark ? "rgba(37,99,235,0.08)" : "rgba(37,99,235,0.04)")
    : (isDark ? "rgba(17,24,39,0.4)" : "rgba(255,255,255,0.7)");
    
  const cardBorder = statusConfig.isActive
    ? (isDark ? "rgba(37,99,235,0.2)" : "rgba(37,99,235,0.15)")
    : (isDark ? "rgba(148,163,184,0.15)" : "rgba(255,255,255,0.9)");

  const reorderBackground = isDark ? "rgba(148,163,184,0.15)" : "#F1F5F9";

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.orderId, { color: theme.text }]}>Order #{order.id}</Text>
          {order.dateLabel ? (
            <Text style={[styles.date, { color: theme.textMuted }]}>
              {order.dateLabel}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.price, { color: theme.primary }]}>₹{order.total}</Text>
      </View>

      <View style={[styles.badge, { backgroundColor: statusConfig.bg }]}>
        <Text style={[styles.badgeText, { color: statusConfig.text }]}>{order.status}</Text>
      </View>

      <View style={styles.actionsRow}>
        {statusConfig.isActive ? (
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.primary }]} activeOpacity={0.9} onPress={onTrack}>
            <Text style={[styles.actionText, { color: "#FFFFFF" }]}>Track Order</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: isDark ? "rgba(37,99,235,0.2)" : "rgba(37,99,235,0.1)" }]} activeOpacity={0.9} onPress={onTrack}>
            <Text style={[styles.actionText, { color: theme.primary }]}>View Details</Text>
          </TouchableOpacity>
        )}

        {onReorder ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: reorderBackground }]}
            activeOpacity={0.9}
            onPress={onReorder}
          >
            <Text style={[styles.actionText, { color: theme.text }]}>Reorder</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderId: {
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 4,
  },
  price: {
    fontWeight: "800",
    fontSize: 18,
  },
  date: {
    fontSize: 13,
    fontWeight: "500",
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontWeight: "700",
    fontSize: 14,
  },
});
