import { NextFunction, Response } from "express";
import { AuthRequest } from "./authMiddleware";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  namespace: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const getClientIp = (req: AuthRequest): string => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.ip || "unknown-ip";
};

export const createRateLimit = (options: RateLimitOptions) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const now = Date.now();
    const userId = String(req.user?.userId || "anonymous");
    const ip = getClientIp(req);
    const key = `${options.namespace}:${userId}:${ip}`;

    const existing = buckets.get(key);
    if (!existing || now > existing.resetAt) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      return next();
    }

    if (existing.count >= options.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader("Retry-After", retryAfterSeconds.toString());
      return res.status(429).json({
        success: false,
        message: "Too many support requests. Please try again shortly.",
        retryAfterSeconds,
      });
    }

    existing.count += 1;
    buckets.set(key, existing);
    next();
  };
};
