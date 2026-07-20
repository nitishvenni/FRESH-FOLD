import { describe, expect, it } from "vitest";
import { createOtpHash, createSecureOtp, normalizeIndianMobile, secureOtpMatch } from "../../src/auth/otp";

describe("OTP identity and credential primitives", () => {
  it.each([
    ["9876543210", "9876543210"],
    ["+919876543210", "9876543210"],
    ["91 9876543210", "9876543210"],
    ["98765-43210", "9876543210"],
    ["123", null],
    ["+449876543210", null],
  ])("normalizes %s safely", (input, expected) => {
    expect(normalizeIndianMobile(input)).toBe(expected);
  });

  it("generates six-digit cryptographically sourced OTPs and compares hashes safely", () => {
    const otp = createSecureOtp();
    expect(otp).toMatch(/^\d{6}$/);
    const expected = createOtpHash("9876543210", "123456", "secret");
    expect(secureOtpMatch(expected, createOtpHash("9876543210", "123456", "secret"))).toBe(true);
    expect(secureOtpMatch(expected, createOtpHash("9876543210", "123457", "secret"))).toBe(false);
  });
});
