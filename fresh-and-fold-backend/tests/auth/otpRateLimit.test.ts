import { describe, expect, it } from "vitest";
import { __resetOtpRateLimitsForTests, createOtpRateLimit } from "../../src/auth/otp";

const response = () => {
  const result: any = { statusCode: 200, body: null, headers: {} };
  result.setHeader = (key: string, value: string) => { result.headers[key] = value; };
  result.status = (statusCode: number) => { result.statusCode = statusCode; return result; };
  result.json = (body: unknown) => { result.body = body; return result; };
  return result;
};

describe("OTP layered rate limits", () => {
  it("limits the same normalized identity independently of formatting", () => {
    __resetOtpRateLimitsForTests();
    const limiter = createOtpRateLimit({ namespace: "test-phone", key: "mobile", max: 2, windowMs: 60_000 });
    const next = () => undefined;
    limiter({ body: { mobile: "+919876543210" }, headers: {}, ip: "1.1.1.1" } as any, response(), next);
    limiter({ body: { mobile: "9876543210" }, headers: {}, ip: "2.2.2.2" } as any, response(), next);
    const blocked = response();
    limiter({ body: { mobile: "91 9876543210" }, headers: {}, ip: "3.3.3.3" } as any, blocked, next);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body).toMatchObject({ code: "OTP_RATE_LIMITED" });
    expect(blocked.headers["Retry-After"]).toBeDefined();
  });

  it("keeps IP and mobile limiters separate", () => {
    __resetOtpRateLimitsForTests();
    const ipLimiter = createOtpRateLimit({ namespace: "test-ip", key: "ip", max: 1, windowMs: 60_000 });
    const phoneLimiter = createOtpRateLimit({ namespace: "test-phone", key: "mobile", max: 1, windowMs: 60_000 });
    const next = () => undefined;
    ipLimiter({ body: { mobile: "9876543210" }, headers: {}, ip: "1.1.1.1" } as any, response(), next);
    const ipBlocked = response();
    ipLimiter({ body: { mobile: "8765432109" }, headers: {}, ip: "1.1.1.1" } as any, ipBlocked, next);
    const phoneAllowed = response();
    phoneLimiter({ body: { mobile: "8765432109" }, headers: {}, ip: "1.1.1.1" } as any, phoneAllowed, next);
    expect(ipBlocked.statusCode).toBe(429);
    expect(phoneAllowed.statusCode).toBe(200);
  });
});
