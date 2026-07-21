export type PaymentIntentReentryState = {
  status: "created" | "provider_order_created" | "payment_confirmed" | "reconciliation_pending" | "reconciled";
  order: { _id: string } | null;
};

/**
 * A saved intent is never silently replaced by new checkout. An existing order
 * opens confirmation; every other persisted state is recovered authoritatively.
 */
export const paymentReentryAction = (intent: PaymentIntentReentryState): "confirmation" | "recovery" =>
  intent.order || intent.status === "reconciled" ? "confirmation" : "recovery";
