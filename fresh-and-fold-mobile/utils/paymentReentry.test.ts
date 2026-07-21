import { describe, expect, it } from "vitest";
import { paymentReentryAction } from "./paymentReentry";

describe("PaymentIntent re-entry guard", () => {
  it("opens the canonical order instead of checkout after reconciliation", () => {
    expect(paymentReentryAction({ status: "reconciled", order: { _id: "order-1" } })).toBe("confirmation");
  });

  it.each(["created", "provider_order_created", "payment_confirmed", "reconciliation_pending"] as const)(
    "routes a persisted %s intent through recovery instead of a new checkout",
    (status) => expect(paymentReentryAction({ status, order: null })).toBe("recovery")
  );
});
