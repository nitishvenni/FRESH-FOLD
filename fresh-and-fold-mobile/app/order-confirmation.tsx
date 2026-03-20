import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import Card from "../components/Card";
import { useAppTheme } from "../hooks/useAppTheme";
import { triggerImpactHaptic, triggerSuccessHaptic } from "../utils/haptics";
import { showToast } from "../utils/toast";

export default function OrderConfirmation() {
  const router = useRouter();
  const { total, date, slot, orderId, status } = useLocalSearchParams();
  const { theme } = useAppTheme();

  useEffect(() => {
    void triggerSuccessHaptic();
    showToast({
      type: "success",
      title: "Order confirmed",
      message: "Your pickup has been scheduled successfully.",
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View entering={ZoomIn.duration(350)} style={styles.animationWrap}>
        <View style={[styles.ringOuter, { backgroundColor: theme.primarySoft }]} />
        <View style={[styles.ringInner, { backgroundColor: theme.surface }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>
            <MaterialIcons name="check-circle" size={52} color={theme.primary} />
          </View>
        </View>
      </Animated.View>

      <Animated.Text entering={FadeInDown.delay(120).duration(280)} style={[styles.title, { color: theme.text }]}>
        Order Confirmed
      </Animated.Text>

      <Animated.Text
        entering={FadeInDown.delay(180).duration(280)}
        style={[styles.subtitle, { color: theme.textMuted }]}
      >
        Your pickup is scheduled and the team is getting ready.
      </Animated.Text>

      <Animated.View entering={FadeInUp.delay(220).duration(280)} style={styles.orderIdCardWrap}>
        <Card style={[styles.orderIdCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.orderIdLabel, { color: theme.textMuted }]}>Order ID</Text>
          <Text style={[styles.orderIdValue, { color: theme.text }]}>#{String(orderId || "").slice(-6).toUpperCase()}</Text>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).duration(280)}>
        <Card style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Pickup Scheduled</Text>
            <Text style={[styles.value, { color: theme.text }]}>{date} - {slot}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Total paid</Text>
            <Text style={[styles.value, { color: theme.text }]}>Rs.{total}</Text>
          </View>
          <Text style={[styles.reminder, { color: theme.textMuted }]}>
            Your clothes will be collected soon. You can track each status update live.
          </Text>
        </Card>
      </Animated.View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.text }]}
        activeOpacity={0.9}
        onPress={() => {
          void triggerImpactHaptic();
          router.replace({
            pathname: "/track-order",
            params: { orderId, status, date, slot },
          });
        }}
      >
        <Text style={[styles.buttonText, { color: theme.surface }]}>Track Order</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  animationWrap: {
    width: 150,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  ringOuter: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    opacity: 0.45,
  },
  ringInner: {
    width: 124,
    height: 124,
    borderRadius: 62,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 110,
    height: 110,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
    maxWidth: 300,
  },
  orderIdCardWrap: {
    width: "100%",
  },
  orderIdCard: {
    width: "100%",
    minWidth: 320,
    alignItems: "center",
    marginBottom: 14,
  },
  orderIdLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  orderIdValue: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 1,
  },
  card: {
    width: "100%",
    minWidth: 320,
    marginBottom: 22,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
  reminder: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  button: {
    width: "100%",
    minWidth: 320,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
