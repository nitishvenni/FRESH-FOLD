import { describe, expect, it } from "vitest";
import { getOtpDemoConfiguration, isConfiguredDemoMobile, isOtpDemoModeRequested, selectOtpDeliveryMode } from "../../src/auth/otpDemo";
import { createOtpHash, secureOtpMatch } from "../../src/auth/otp";

const configured = {
  OTP_DEMO_MODE: "true",
  OTP_DEMO_MOBILE: "9876543210",
  OTP_DEMO_CODE: "123456",
};

describe("server-controlled evaluator demo OTP mode", () => {
  it("is disabled unless explicitly enabled with a valid mobile and six-digit code", () => {
    expect(getOtpDemoConfiguration({ ...configured, OTP_DEMO_MODE: "false" })).toBeNull();
    expect(getOtpDemoConfiguration({ ...configured, OTP_DEMO_MOBILE: "not-a-mobile" })).toBeNull();
    expect(getOtpDemoConfiguration({ ...configured, OTP_DEMO_CODE: "12345" })).toBeNull();
    expect(isOtpDemoModeRequested(configured)).toBe(true);
  });

  it("matches only the exact normalized configured mobile", () => {
    const demo = getOtpDemoConfiguration(configured);
    expect(demo).toEqual({ mobile: "9876543210", code: "123456" });
    expect(isConfiguredDemoMobile("9876543210", demo)).toBe(true);
    expect(isConfiguredDemoMobile("987654321", demo)).toBe(false);
    expect(isConfiguredDemoMobile("99876543210", demo)).toBe(false);
    expect(isConfiguredDemoMobile("9876543211", demo)).toBe(false);
  });

  it("accepts equivalent +91 formatting only through canonical mobile normalization", () => {
    const demo = getOtpDemoConfiguration({ ...configured, OTP_DEMO_MOBILE: "+91 98765 43210" });
    expect(demo?.mobile).toBe("9876543210");
  });

  it("uses no external transport only for the configured demo mobile", () => {
    const demo = getOtpDemoConfiguration(configured);
    expect(selectOtpDeliveryMode("9876543210", demo, true, false)).toBe("demo");
    expect(selectOtpDeliveryMode("9999999999", demo, true, false)).toBe("fast2sms");
    expect(selectOtpDeliveryMode("9999999999", demo, false, false)).toBeNull();
    expect(selectOtpDeliveryMode("9999999999", demo, false, true)).toBe("local");
  });

  it("uses the existing HMAC challenge mechanism rather than a universal OTP", () => {
    const demo = getOtpDemoConfiguration(configured)!;
    const expected = createOtpHash(demo.mobile, demo.code, "server-secret");
    expect(secureOtpMatch(expected, createOtpHash("9876543210", "123456", "server-secret"))).toBe(true);
    expect(secureOtpMatch(expected, createOtpHash("9999999999", "123456", "server-secret"))).toBe(false);
  });
});
