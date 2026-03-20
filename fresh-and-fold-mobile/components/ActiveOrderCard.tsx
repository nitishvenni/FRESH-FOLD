import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import Card from "./Card";

type ActiveOrder = {
  _id: string;
  status: string;
};

type ActiveOrderCardProps = {
  order: ActiveOrder | null;
  onTrackOrder: () => void;
  onSchedulePickup: () => void;
};

const timelineSteps = ["Scheduled", "Picked", "Cleaning", "Delivery"];

const getCurrentStep = (status: string) => {
  switch (status) {
    case "Scheduled":
      return 0;
    case "Received at Facility":
    case "Picked Up":
      return 1;
    case "Washing":
    case "Ironing":
      return 2;
    case "Out for Delivery":
    case "Delivered":
      return 3;
    default:
      return 0;
  }
};

export default function ActiveOrderCard({
  order,
  onTrackOrder,
  onSchedulePickup,
}: ActiveOrderCardProps) {
  const { theme, isDark } = useAppTheme();

  if (!order) {
    return (
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View
            style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}
          >
            <MaterialIcons name="inventory-2" size={22} color={theme.primary} />
          </View>
          <View
            style={[
              styles.badgeMuted,
              { backgroundColor: isDark ? theme.surfaceAlt : "#F3F4F6" },
            ]}
          >
            <Text style={[styles.badgeMutedText, { color: theme.textMuted }]}>
              No active orders
            </Text>
          </View>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          Ready for your next pickup
        </Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Schedule a doorstep collection in seconds and keep every order in one
          place.
        </Text>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.text }]}
          onPress={onSchedulePickup}
        >
          <Text style={styles.primaryButtonText}>Schedule Pickup</Text>
        </TouchableOpacity>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>
          <MaterialIcons
            name="local-laundry-service"
            size={22}
            color={theme.primary}
          />
        </View>
        <View style={[styles.badge, { backgroundColor: theme.primarySoft }]}>
          <Text style={[styles.badgeText, { color: theme.primary }]}>
            Live order
          </Text>
        </View>
      </View>

      <Text style={[styles.eyebrow, { color: theme.primary }]}>Active Order</Text>
      <Text style={[styles.title, { color: theme.text }]}>
        Your order is {order.status.toLowerCase()}
      </Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Order #{order._id.slice(-6)}
      </Text>

      <View style={styles.timelineRow}>
        {timelineSteps.map((step, index) => {
          const isActive = index <= getCurrentStep(order.status);
          const isLast = index === timelineSteps.length - 1;

          return (
            <View key={step} style={styles.timelineStep}>
              <View
                style={[
                  styles.timelineDot,
                  { backgroundColor: isActive ? theme.success : theme.border },
                ]}
              />
              {!isLast ? (
                <View
                  style={[
                    styles.timelineLine,
                    {
                      backgroundColor: isActive
                        ? isDark
                          ? theme.success
                          : "#86EFAC"
                        : theme.border,
                    },
                  ]}
                />
              ) : null}
            </View>
          );
        })}
      </View>
      <Text style={[styles.timelineText, { color: theme.textMuted }]}>
        Scheduled | Picked | Cleaning | Delivery
      </Text>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: theme.text }]}
        onPress={onTrackOrder}
      >
        <Text style={styles.primaryButtonText}>Track Order</Text>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  badgeMuted: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeMutedText: {
    fontSize: 12,
    fontWeight: "700",
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  timelineStep: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  timelineLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 6,
  },
  timelineText: {
    fontSize: 13,
    marginBottom: 18,
  },
  primaryButton: {
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
