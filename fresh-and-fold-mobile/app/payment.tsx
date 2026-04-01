import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import RazorpayCheckout from "react-native-razorpay";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "../components/Card";
import PaymentMethodCard from "../components/PaymentMethodCard";
import { useAppTheme } from "../hooks/useAppTheme";
import { handleError } from "../utils/errorHandler";
import { triggerImpactHaptic } from "../utils/haptics";
import { calculateSubtotal, DELIVERY_CHARGE, FREE_DELIVERY_THRESHOLD } from "../utils/pricing";
import { createOrder, getOrderPreview, getOrders } from "../services/orderService";
import { createPaymentOrder, reportPaymentFailure, verifyPayment } from "../services/paymentService";
import { formatPrice } from "../utils/formatPrice";
import { showToast } from "../utils/toast";

const getPaymentFailureMessage = (error: any) => {
  const raw = String(error?.description || error?.message || "")
    .trim()
    .toLowerCase();

  if (raw.includes("cancel") || raw.includes("dismiss") || raw.includes("back")) {
    return "Payment was cancelled. No order was created.";
  }

  return "Payment failed. Please try again.";
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Payment() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { service, items, date, slot, addressId } = useLocalSearchParams();

  const parsedItems = useMemo<Record<string, number>>(
    () => (items ? JSON.parse(items as string) : {}),
    [items]
  );

  const getOrderItems = () =>
    Object.keys(parsedItems)
      .filter((key) => Number(parsedItems[key]) > 0)
      .map((key) => ({
        itemName: key,
        quantity: Number(parsedItems[key]),
      }));

  const runWithNetworkRetry = async <T,>(task: () => Promise<T>, attempts = 3) => {
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await task();
      } catch (error) {
        lastError = error;
        if (!(error instanceof Error) || error.message !== "NETWORK_ERROR" || attempt === attempts - 1) {
          throw error;
        }
        await wait(1000 * (attempt + 1));
      }
    }

    throw lastError instanceof Error ? lastError : new Error("NETWORK_ERROR");
  };

  const goToConfirmation = (params: { orderId: string; total: number; status?: string }) => {
    router.replace({
      pathname: "/order-confirmation",
      params: {
        orderId: params.orderId,
        total: params.total,
        date,
        slot,
        status: params.status || "Scheduled",
      },
    });
  };

  const recoverExistingOrder = async () => {
    const latestOrder = [...(await runWithNetworkRetry(() => getOrders()))]
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )[0];

    if (!latestOrder) {
      throw new Error("No order found after payment");
    }

    goToConfirmation({
      orderId: latestOrder._id,
      total: latestOrder.totalAmount || 0,
      status: latestOrder.status,
    });
  };

  const fallbackSubtotal = calculateSubtotal(parsedItems, service);
  const fallbackDelivery =
    fallbackSubtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_CHARGE : 0;
  const [backendTotal, setBackendTotal] = useState<number>(fallbackSubtotal + fallbackDelivery);
  const [pricingRefreshing, setPricingRefreshing] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    void fetchPreview();
  }, []);

  const fetchPreview = async () => {
    try {
      const data = await Promise.race([
        getOrderPreview({
            items: getOrderItems(),
            service,
        }),
        new Promise<{
          success: boolean;
          totalAmount: number;
          deliveryCharge: number;
        }>((_, reject) => setTimeout(() => reject(new Error("PREVIEW_TIMEOUT")), 8000)),
      ]);

      setBackendTotal(data.totalAmount);
    } catch (error) {
      if (!(error instanceof Error && error.message === "PREVIEW_TIMEOUT")) {
        handleError(error);
      }
    } finally {
      setPricingRefreshing(false);
    }
  };

  const createOrderInBackend = async (paymentVerificationToken: string) => {
    try {
      const data = await runWithNetworkRetry(() =>
        createOrder({
          addressId,
          items: getOrderItems(),
          service,
          paymentVerificationToken,
        })
      );

      goToConfirmation({
        orderId: data.order._id,
        total: data.order.totalAmount,
        status: data.order.status,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Payment already linked to an order") {
        await recoverExistingOrder();
        return;
      }
      throw error;
    }
  };

  const logFailedPayment = async (details: {
    paymentOrderId?: string;
    paymentId?: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }) => {
    try {
      await reportPaymentFailure({
        addressId,
        items: getOrderItems(),
        service,
        paymentOrderId: details.paymentOrderId,
        paymentId: details.paymentId,
        totalAmount: backendTotal,
        reason: details.reason,
        metadata: details.metadata,
      });
    } catch {
      // Best-effort logging only; checkout UX should use the original payment error.
    }
  };

  const startRazorpayPayment = async () => {
    const data = await createPaymentOrder({
      addressId,
      items: getOrderItems(),
      service,
    });

    let paymentResult: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    };

    if (data.mock) {
      paymentResult = {
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_order_id: data.paymentOrder.id,
        razorpay_signature: "mock_signature",
      };
    } else {
      try {
        paymentResult = await RazorpayCheckout.open({
          key: data.keyId,
          amount: data.paymentOrder.amount,
          currency: data.paymentOrder.currency,
          order_id: data.paymentOrder.id,
          name: "Fresh & Fold",
          description: "Laundry order payment",
          theme: { color: "#2563EB" },
        });
      } catch (error: any) {
        await logFailedPayment({
          paymentOrderId: data.paymentOrder.id,
          paymentId: error?.razorpay_payment_id,
          reason: getPaymentFailureMessage(error),
          metadata: {
            code: error?.code,
            step: "checkout_open",
            description: error?.description,
          },
        });
        throw error;
      }
    }

    const verifyData = await runWithNetworkRetry(() =>
      verifyPayment({
        addressId,
        items: getOrderItems(),
        service,
        payment: {
          razorpay_payment_id: paymentResult.razorpay_payment_id,
          razorpay_order_id: paymentResult.razorpay_order_id,
          razorpay_signature: paymentResult.razorpay_signature,
        },
      })
    );

    if (!verifyData.paymentVerificationToken) {
      throw new Error(verifyData.message || "Payment verification failed");
    }

    await createOrderInBackend(verifyData.paymentVerificationToken);
  };

  const confirmOrder = async () => {
    if (processingPayment) {
      return;
    }

    setProcessingPayment(true);
    try {
      void triggerImpactHaptic();
      await startRazorpayPayment();
    } catch (error: any) {
      if (
        error instanceof Error &&
        (error.message === "SESSION_EXPIRED" || error.message === "NETWORK_ERROR")
      ) {
        handleError(error);
      } else {
        showToast({
          type: "error",
          title: "Payment failed",
          message: getPaymentFailureMessage(error),
        });
      }
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.backgroundGlowTop, { backgroundColor: theme.primarySoft, opacity: isDark ? 0.22 : 0.9 }]} />
      <View style={[styles.backgroundGlowBottom, { backgroundColor: theme.primarySoft, opacity: isDark ? 0.14 : 0.5 }]} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.header, { color: theme.text }]}>Secure Payment</Text>
        <Text style={[styles.subheader, { color: theme.textMuted }]}>
          Complete your order with a fast and secure payment experience.
        </Text>

        <Card style={styles.totalCard}>
          <Text style={[styles.totalLabel, { color: theme.textMuted }]}>Order Total</Text>
          <Text style={[styles.total, { color: theme.text }]}>{formatPrice(backendTotal)}</Text>
          {pricingRefreshing ? (
            <Text style={[styles.refreshText, { color: theme.textMuted }]}>Updating final pricing...</Text>
          ) : null}
        </Card>

        <Text style={[styles.section, { color: theme.text }]}>Payment Method</Text>
        <PaymentMethodCard />

        <View style={styles.securityRow}>
          <MaterialIcons name="lock" size={18} color={theme.success} />
          <Text style={[styles.secure, { color: theme.success }]}>100% Secure Payment</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 18, backgroundColor: theme.glass }]}>
        <TouchableOpacity
          disabled={processingPayment}
          style={[styles.payButton, { backgroundColor: theme.primary }, processingPayment && styles.payButtonDisabled]}
          activeOpacity={0.9}
          onPress={confirmOrder}
        >
          <Text style={styles.payText}>
            {processingPayment ? "Processing..." : "Pay with Razorpay"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -90,
    right: -36,
    width: 210,
    height: 210,
    borderRadius: 105,
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: 110,
    left: -70,
    width: 190,
    height: 190,
    borderRadius: 95,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subheader: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  totalCard: {
    marginBottom: 20,
    padding: 20,
  },
  totalLabel: {
    fontSize: 14,
    marginBottom: 6,
  },
  total: {
    fontSize: 32,
    fontWeight: "800",
  },
  refreshText: {
    marginTop: 8,
    fontSize: 12,
  },
  section: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  securityRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  secure: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "700",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  payButton: {
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  payButtonDisabled: {
    opacity: 0.45,
  },
  payText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
});
