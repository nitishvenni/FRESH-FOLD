/**
 * External SMS delivery boundary. It deliberately has no verification API:
 * Fresh & Fold remains the only authority for OTP validation and consumption.
 */
export const FAST2SMS_OTP_SEND_URL = "https://www.fast2sms.com/dev/otp/send";
const FAST2SMS_TIMEOUT_MS = 10_000;

export type Fast2SmsConfiguration = {
  apiKey: string;
  otpId: string;
};

export type OtpDeliveryFailure = "timeout" | "network" | "http" | "malformed_response" | "provider_rejected";

export class OtpDeliveryError extends Error {
  readonly category: OtpDeliveryFailure;
  readonly status?: number;

  constructor(category: OtpDeliveryFailure, status?: number) {
    super("OTP delivery is unavailable");
    this.name = "OtpDeliveryError";
    this.category = category;
    this.status = status;
  }
}

export const getFast2SmsConfiguration = (
  environment: NodeJS.ProcessEnv = process.env
): Fast2SmsConfiguration | null => {
  const apiKey = String(environment.FAST2SMS_API_KEY || "").trim();
  const otpId = String(environment.FAST2SMS_OTP_ID || "").trim();
  return apiKey && otpId ? { apiKey, otpId } : null;
};

type FetchLike = typeof fetch;

type SendOtpSmsOptions = {
  mobile: string;
  otp: string;
  expirySeconds: number;
  configuration: Fast2SmsConfiguration;
  fetchImplementation?: FetchLike;
};

/** Sends a backend-generated OTP to one canonical ten-digit Indian mobile. */
export const sendOtpSms = async ({
  mobile,
  otp,
  expirySeconds,
  configuration,
  fetchImplementation = fetch,
}: SendOtpSmsOptions): Promise<void> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FAST2SMS_TIMEOUT_MS);
  try {
    const response = await fetchImplementation(FAST2SMS_OTP_SEND_URL, {
      method: "POST",
      headers: {
        Authorization: configuration.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mobile,
        otp_id: configuration.otpId,
        otp,
        otp_length: otp.length,
        otp_expiry: Math.max(1, Math.ceil(expirySeconds / 60)),
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new OtpDeliveryError("http", response.status);

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new OtpDeliveryError("malformed_response", response.status);
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new OtpDeliveryError("malformed_response", response.status);
    }
    const result = data as { return?: unknown; status?: unknown };
    const rejected = (value: unknown) => value === false || (typeof value === "string" && value.toLowerCase() === "false");
    if (rejected(result.return) || rejected(result.status)) {
      throw new OtpDeliveryError("provider_rejected", response.status);
    }
  } catch (error) {
    if (error instanceof OtpDeliveryError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new OtpDeliveryError("timeout");
    throw new OtpDeliveryError("network");
  } finally {
    clearTimeout(timeout);
  }
};
