import PaymentIntent from "../models/PaymentIntent";
import Order from "../models/Order";

export type ReconciliationResult = {
  order: any | null;
  status: "payment_pending" | "reconciliation_pending" | "reconciled";
};

const canonicalOrderFor = async (intent: any) => {
  if (intent.orderId) {
    const linked = await Order.findById(intent.orderId);
    if (linked) return linked;
  }
  return Order.findOne({ paymentIntentId: intent._id });
};

const linkCanonicalOrder = async (intent: any, order: any) => {
  await PaymentIntent.updateOne(
    { _id: intent._id },
    { $set: { orderId: order._id, status: "reconciled", reconciledAt: new Date(), reconciliationFailureCode: null } }
  );
};

/** Creates an Order only from the durable, server-validated PaymentIntent snapshot. */
export const reconcilePaymentIntent = async (paymentIntentId: string): Promise<ReconciliationResult> => {
  const intent = await PaymentIntent.findById(paymentIntentId);
  if (!intent || !["payment_confirmed", "reconciliation_pending", "reconciled"].includes(intent.status)) {
    return { order: null, status: "payment_pending" };
  }

  const existing = await canonicalOrderFor(intent);
  if (existing) {
    await linkCanonicalOrder(intent, existing);
    return { order: existing, status: "reconciled" };
  }

  const paymentId = String(intent.razorpayPaymentId || "").trim();
  const paymentOrderId = String(intent.razorpayOrderId || "").trim();
  if (!paymentId || !paymentOrderId) {
    return { order: null, status: "reconciliation_pending" };
  }

  try {
    const order = await Order.create({
      userId: intent.userId,
      addressId: intent.addressId,
      addressSnapshot: intent.addressSnapshot,
      cleaningService: intent.cleaningService,
      speed: intent.speed,
      pickupDate: intent.pickupDate,
      pickupSlot: intent.pickupSlot,
      items: intent.items,
      deliveryCharge: intent.deliveryCharge,
      totalAmount: intent.totalAmount,
      paymentIntentId: intent._id,
      paymentId,
      paymentOrderId,
      paymentStatus: "paid",
      paidAt: intent.paymentConfirmedAt || new Date(),
      status: "Scheduled",
    });
    await linkCanonicalOrder(intent, order);
    return { order, status: "reconciled" };
  } catch (error: any) {
    if (error?.code === 11000) {
      const winner = await Order.findOne({
        $or: [
          { paymentIntentId: intent._id },
          ...(intent.razorpayPaymentId ? [{ paymentId: intent.razorpayPaymentId }] : []),
          ...(intent.razorpayOrderId ? [{ paymentOrderId: intent.razorpayOrderId }] : []),
        ],
      });
      if (winner) {
        await linkCanonicalOrder(intent, winner);
        return { order: winner, status: "reconciled" };
      }
    }
    // A captured payment is retained for a later webhook/client recovery; no
    // booking window is revalidated and no payment state is rolled back.
    await PaymentIntent.updateOne(
      { _id: intent._id, orderId: null },
      { $set: { status: "reconciliation_pending", reconciliationFailureCode: "ORDER_CREATION_FAILED" } }
    );
    return { order: null, status: "reconciliation_pending" };
  }
};
