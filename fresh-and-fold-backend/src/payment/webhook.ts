import crypto from "crypto";

export const isValidRazorpayWebhookSignature = (
  rawBody: Buffer,
  signature: unknown,
  webhookSecret: string
) => {
  if (!webhookSecret || typeof signature !== "string" || !signature.trim()) return false;
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  const received = Buffer.from(signature.trim(), "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return received.length === expectedBuffer.length && crypto.timingSafeEqual(received, expectedBuffer);
};

export type RazorpayCapturedPayment = {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
};

export const getCapturedPaymentFromWebhook = (payload: unknown): RazorpayCapturedPayment | null => {
  if (!payload || typeof payload !== "object") return null;
  const event = payload as { event?: unknown; payload?: { payment?: { entity?: Record<string, unknown> } } };
  if (event.event !== "payment.captured") return null;
  const payment = event.payload?.payment?.entity;
  if (!payment) return null;
  const id = typeof payment.id === "string" ? payment.id.trim() : "";
  const orderId = typeof payment.order_id === "string" ? payment.order_id.trim() : "";
  const amount = typeof payment.amount === "number" ? payment.amount : Number(payment.amount);
  const currency = typeof payment.currency === "string" ? payment.currency.trim() : "";
  return id && orderId && Number.isSafeInteger(amount) && amount > 0 && currency
    ? { id, orderId, amount, currency }
    : null;
};
