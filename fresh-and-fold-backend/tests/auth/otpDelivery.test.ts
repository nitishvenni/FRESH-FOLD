import { describe, expect, it, vi } from "vitest";
import {
  FAST2SMS_OTP_SEND_URL,
  getFast2SmsConfiguration,
  OtpDeliveryError,
  sendOtpSms,
} from "../../src/auth/otpDelivery";

const configuration = { apiKey: "fast2sms-secret", otpId: "otp-template-id" };
const send = (fetchImplementation: typeof fetch) => sendOtpSms({
  mobile: "9876543210",
  otp: "123456",
  expirySeconds: 300,
  configuration,
  fetchImplementation,
});

describe("Fast2SMS OTP delivery", () => {
  it("sends the backend-generated OTP to the canonical mobile through the Authorization header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ return: true }), { status: 200 }));
    await send(fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledWith(FAST2SMS_OTP_SEND_URL, expect.objectContaining({
      method: "POST",
      headers: { Authorization: "fast2sms-secret", "Content-Type": "application/json" },
    }));
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(options.body))).toEqual({
      mobile: "9876543210", otp_id: "otp-template-id", otp: "123456", otp_length: 6, otp_expiry: 5,
    });
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("fast2sms-secret");
  });

  it.each([
    ["HTTP 400", () => new Response(JSON.stringify({}), { status: 400 }), "http"],
    ["HTTP 401", () => new Response(JSON.stringify({}), { status: 401 }), "http"],
    ["malformed JSON", () => new Response("not-json", { status: 200 }), "malformed_response"],
    ["provider rejection", () => new Response(JSON.stringify({ return: false }), { status: 200 }), "provider_rejected"],
  ] as const)("maps %s to a safe delivery failure", async (_name, response, category) => {
    const fetchMock = vi.fn().mockResolvedValue(response());
    await expect(send(fetchMock as unknown as typeof fetch)).rejects.toMatchObject<OtpDeliveryError>({
      name: "OtpDeliveryError", category,
    });
  });

  it("maps network and abort failures without exposing provider content", async () => {
    const network = vi.fn().mockRejectedValue(new Error("connection reset"));
    await expect(send(network as unknown as typeof fetch)).rejects.toMatchObject<OtpDeliveryError>({ category: "network" });
    const timeout = vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    await expect(send(timeout as unknown as typeof fetch)).rejects.toMatchObject<OtpDeliveryError>({ category: "timeout" });
  });

  it("requires both Fast2SMS configuration values and keeps them server-side", () => {
    expect(getFast2SmsConfiguration({ FAST2SMS_API_KEY: "key", FAST2SMS_OTP_ID: "template" })).toEqual({ apiKey: "key", otpId: "template" });
    expect(getFast2SmsConfiguration({ FAST2SMS_API_KEY: "key" })).toBeNull();
    expect(getFast2SmsConfiguration({ FAST2SMS_OTP_ID: "template" })).toBeNull();
  });
});
