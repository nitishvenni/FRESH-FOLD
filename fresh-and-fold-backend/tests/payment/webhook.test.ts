import crypto from "crypto";
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { getCapturedPaymentFromWebhook, isValidRazorpayWebhookSignature } from "../../src/payment/webhook";

describe("Razorpay webhook boundary", () => {
  const secret = "test-webhook-secret";
  const body = Buffer.from(JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: "pay_1", order_id: "order_1", amount: 12500, currency: "INR" } } },
  }));
  const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");

  it("accepts only the signature for the exact raw body", () => {
    expect(isValidRazorpayWebhookSignature(body, signature, secret)).toBe(true);
    expect(isValidRazorpayWebhookSignature(Buffer.from(`${body} `), signature, secret)).toBe(false);
    expect(isValidRazorpayWebhookSignature(body, "bad", secret)).toBe(false);
    expect(isValidRazorpayWebhookSignature(body, undefined, secret)).toBe(false);
    expect(isValidRazorpayWebhookSignature(body, signature, "")).toBe(false);
  });

  it("extracts only a complete payment.captured identity", () => {
    expect(getCapturedPaymentFromWebhook(JSON.parse(body.toString()))).toEqual({ id: "pay_1", orderId: "order_1", amount: 12500, currency: "INR" });
    expect(getCapturedPaymentFromWebhook({ event: "payment.failed" })).toBeNull();
    expect(getCapturedPaymentFromWebhook({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1" } } } })).toBeNull();
  });

  it("keeps webhook bytes untouched by the later JSON parser", async () => {
    const app = express();
    app.post("/payments/webhook/razorpay", express.raw({ type: "application/json" }), (req, res) => {
      const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      if (!isValidRazorpayWebhookSignature(raw, req.header("x-razorpay-signature"), secret)) {
        return res.status(401).json({ code: "INVALID_WEBHOOK_SIGNATURE" });
      }
      return res.json({ success: true, receivedRawBody: raw.equals(body) });
    });
    app.use(express.json());

    await request(app)
      .post("/payments/webhook/razorpay")
      .set("Content-Type", "application/json")
      .set("x-razorpay-signature", signature)
      .send(body)
      .expect(200, { success: true, receivedRawBody: true });

    await request(app)
      .post("/payments/webhook/razorpay")
      .set("Content-Type", "application/json")
      .set("x-razorpay-signature", signature)
      .send(Buffer.concat([body, Buffer.from(" ")]))
      .expect(401, { code: "INVALID_WEBHOOK_SIGNATURE" });
  });
});
