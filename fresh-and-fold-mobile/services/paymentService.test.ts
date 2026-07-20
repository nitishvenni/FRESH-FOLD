import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  api: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("@react-native-async-storage/async-storage", () => ({ default: mocks.storage }));
vi.mock("./api", () => ({ default: mocks.api }));

import {
  PENDING_PAYMENT_INTENT_STORAGE_KEY,
  clearPendingPaymentIntentId,
  createPaymentOrder,
  getPaymentIntent,
  getPendingPaymentIntentId,
  savePendingPaymentIntentId,
  verifyPayment,
} from "./paymentService";

describe("PaymentIntent mobile transport and recovery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates checkout from the canonical schedule and no client amount", async () => {
    await createPaymentOrder({ addressId: "address-1", items: [{ itemName: "shirt", quantity: 2 }], cleaningService: "wash", speed: "standard", pickupDate: "2026-07-22", pickupSlot: "9 AM - 12 PM" });
    expect(mocks.api.post).toHaveBeenCalledWith("/payments/create-order", expect.objectContaining({ pickupDate: "2026-07-22", pickupSlot: "9 AM - 12 PM" }));
    expect(mocks.api.post.mock.calls[0][1]).not.toHaveProperty("totalAmount");
  });

  it("uses a specific PaymentIntent for verification and recovery", async () => {
    const payment = { razorpay_payment_id: "pay_1", razorpay_order_id: "order_1", razorpay_signature: "signature" };
    await verifyPayment({ paymentIntentId: "intent-1", payment });
    await getPaymentIntent("intent-1");
    expect(mocks.api.post).toHaveBeenCalledWith("/payment/verify", { paymentIntentId: "intent-1", payment });
    expect(mocks.api.get).toHaveBeenCalledWith("/payments/intents/intent-1");
  });

  it("stores only the opaque pending intent identifier and clears it after recovery", async () => {
    mocks.storage.getItem.mockResolvedValue("intent-1");
    await savePendingPaymentIntentId("intent-1");
    await expect(getPendingPaymentIntentId()).resolves.toBe("intent-1");
    await clearPendingPaymentIntentId();
    expect(mocks.storage.setItem).toHaveBeenCalledWith(PENDING_PAYMENT_INTENT_STORAGE_KEY, "intent-1");
    expect(mocks.storage.removeItem).toHaveBeenCalledWith(PENDING_PAYMENT_INTENT_STORAGE_KEY);
  });
});
