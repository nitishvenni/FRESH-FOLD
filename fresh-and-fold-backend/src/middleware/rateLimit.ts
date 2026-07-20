import { NextFunction, Response } from "express";
import { AuthRequest } from "./authMiddleware";

export type RateLimitOptions = {
  windowMs: number;
  max: number;
  namespace: string;
  /** Defaults to the existing composite user/IP behavior for all current routes. */
  keyStrategy?: "user-ip" | "user";
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
  };
  /** Optional best-effort observer. It must not throw or alter the response. */
  onRejected?: (req: AuthRequest, res: Response) => void;
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
    const key =
      options.keyStrategy === "user"
        ? `${options.namespace}:${userId}`
        : `${options.namespace}:${userId}:${ip}`;

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
      try { options.onRejected?.(req, res); } catch { /* telemetry is non-critical */ }

      if (options.error) {
        const requestId = res.locals.aiRequestId;
        return res.status(429).json({
          code: options.error.code,
          message: options.error.message,
          retryable: options.error.retryable ?? true,
          ...(typeof requestId === "string" ? { requestId } : {}),
          retryAfterSeconds,
        });
      }

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
