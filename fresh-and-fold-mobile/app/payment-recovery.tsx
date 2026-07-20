import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "../components/Card";
import { useAppTheme } from "../hooks/useAppTheme";
import { clearBookingDraft } from "../utils/bookingDraft";
import { clearPendingPaymentIntentId, getPaymentIntent } from "../services/paymentService";

export default function PaymentRecoveryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { paymentIntentId } = useLocalSearchParams<{ paymentIntentId?: string }>();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const intentId = Array.isArray(paymentIntentId) ? paymentIntentId[0] : paymentIntentId;
    if (!intentId) {
      setError("Payment recovery is unavailable.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getPaymentIntent(intentId);
      if (result.order) {
        await Promise.all([clearPendingPaymentIntentId(), clearBookingDraft()]);
        router.replace({ pathname: "/order-confirmation", params: { orderId: result.order._id, total: result.order.totalAmount, status: result.order.status || "Scheduled", date: result.order.pickupDate || "", slot: result.order.pickupSlot || "" } });
        return;
      }
      setPending(true);
    } catch {
      setError("We could not check the payment yet. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [paymentIntentId, router]);

  useEffect(() => { void refresh(); }, [refresh]);

  return <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 24 }]}>
    <Card style={[styles.card, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>Checking payment</Text>
      <Text style={[styles.copy, { color: theme.textMuted }]}>
        {loading ? "Confirming your payment and booking…" : pending ? "Your payment confirmation is still being processed. You will not be charged again." : error || "Payment recovery is unavailable."}
      </Text>
      <TouchableOpacity disabled={loading} style={[styles.primary, { backgroundColor: theme.primary }, loading && styles.disabled]} onPress={() => void refresh()}><Text style={styles.primaryText}>Refresh status</Text></TouchableOpacity>
      <TouchableOpacity style={[styles.secondary, { borderColor: theme.border }]} onPress={() => router.replace("/home")}><Text style={[styles.secondaryText, { color: theme.text }]}>Back to Home</Text></TouchableOpacity>
    </Card>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 }, card: { marginTop: 80, padding: 22 }, title: { fontSize: 24, fontWeight: "700" }, copy: { marginTop: 12, fontSize: 15, lineHeight: 22 }, primary: { marginTop: 24, minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" }, primaryText: { color: "#fff", fontSize: 16, fontWeight: "700" }, secondary: { marginTop: 12, minHeight: 50, borderWidth: 1, borderRadius: 16, alignItems: "center", justifyContent: "center" }, secondaryText: { fontSize: 15, fontWeight: "700" }, disabled: { opacity: 0.5 },
});
