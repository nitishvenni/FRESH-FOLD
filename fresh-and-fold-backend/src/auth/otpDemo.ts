import { normalizeIndianMobile } from "./otp";

export type OtpDemoConfiguration = {
  mobile: string;
  code: string;
};

export const isOtpDemoModeRequested = (environment: NodeJS.ProcessEnv = process.env): boolean =>
  String(environment.OTP_DEMO_MODE || "").toLowerCase() === "true";

/** Returns a usable server-only evaluator configuration, never a fallback OTP. */
export const getOtpDemoConfiguration = (
  environment: NodeJS.ProcessEnv = process.env
): OtpDemoConfiguration | null => {
  if (!isOtpDemoModeRequested(environment)) return null;
  const mobile = normalizeIndianMobile(environment.OTP_DEMO_MOBILE);
  const code = String(environment.OTP_DEMO_CODE || "").trim();
  return mobile && /^\d{6}$/.test(code) ? { mobile, code } : null;
};

export const isConfiguredDemoMobile = (mobile: string, configuration: OtpDemoConfiguration | null): boolean =>
  configuration !== null && mobile === configuration.mobile;

export type OtpDeliveryMode = "demo" | "fast2sms" | "local" | null;

/** Chooses delivery only; verification always remains the OtpChallenge hash path. */
export const selectOtpDeliveryMode = (
  mobile: string,
  demoConfiguration: OtpDemoConfiguration | null,
  fast2SmsEnabled: boolean,
  localDevelopmentEnabled: boolean
): OtpDeliveryMode => {
  if (isConfiguredDemoMobile(mobile, demoConfiguration)) return "demo";
  if (fast2SmsEnabled) return "fast2sms";
  return localDevelopmentEnabled ? "local" : null;
};
