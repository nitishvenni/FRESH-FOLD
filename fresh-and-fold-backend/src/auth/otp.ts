import crypto from "crypto";
import { NextFunction, Request, Response } from "express";

export const normalizeIndianMobile = (value: unknown): string | null => {
  const compact = String(value || "").trim().replace(/[\s()-]/g, "");
  const digits = compact.replace(/^\+/, "");
  const mobile = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  return /^\d{10}$/.test(mobile) ? mobile : null;
};

export const createOtpHash = (mobile: string, otp: string, secret: string) =>
  crypto.createHmac("sha256", secret).update(`${mobile}:${otp}`).digest("hex");

export const createSecureOtp = () => crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

export const secureOtpMatch = (expected: string, actual: string) => {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(actual, "utf8");
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};

type OtpLimiterOptions = { namespace: string; max: number; windowMs: number; key: "ip" | "mobile" };
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// req.ip is proxy-aware after the app applies its bounded trust-proxy policy.
// Never trust a client-supplied x-forwarded-for value directly.
const getClientIp = (req: Request) => req.ip || "unknown-ip";

export const createOtpRateLimit = (options: OtpLimiterOptions) => (req: Request, res: Response, next: NextFunction) => {
  const now = Date.now();
  const keyValue = options.key === "ip" ? getClientIp(req) : normalizeIndianMobile(req.body?.mobile) || "invalid-mobile";
  const key = `${options.namespace}:${keyValue}`;
  const current = buckets.get(key);
  if (!current || now > current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return next();
  }
  if (current.count >= options.max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({ code: "OTP_RATE_LIMITED", message: "Please wait before trying again.", retryAfterSeconds });
  }
  current.count += 1;
  buckets.set(key, current);
  next();
};

export const __resetOtpRateLimitsForTests = () => buckets.clear();
