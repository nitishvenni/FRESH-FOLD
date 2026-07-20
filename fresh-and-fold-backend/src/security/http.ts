import cors, { type CorsOptions } from "cors";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import helmet from "helmet";
import { createRateLimit, type RateLimitOptions } from "../middleware/rateLimit";

export const JSON_BODY_LIMIT = "100kb";
export const HTTP_CORS_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;
export const HTTP_CORS_ALLOWED_HEADERS = ["Authorization", "Content-Type", "X-Request-Id"] as const;

type HttpSecurityEnvironment = {
  NODE_ENV?: string;
  HTTP_CORS_ORIGINS?: string;
  GLOBAL_RATE_LIMIT_WINDOW_MS?: string;
  GLOBAL_RATE_LIMIT_MAX?: string;
  TRUST_PROXY_HOPS?: string;
};

const positiveInteger = (value: string | undefined): number | undefined => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const getHttpCorsOrigins = (environment: HttpSecurityEnvironment = process.env): string[] => {
  const origins = String(environment.HTTP_CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (environment.NODE_ENV === "production" && origins.length === 0) {
    throw new Error("HTTP_CORS_ORIGINS must be configured in production");
  }

  return origins;
};

export const isHttpOriginAllowed = (
  origin: string | undefined,
  allowedOrigins: readonly string[],
  isProduction: boolean
): boolean => {
  // React Native and server-to-server callers do not use browser CORS and
  // normally have no Origin header. Browser origins are strict in production.
  if (!origin) return true;
  return !isProduction || allowedOrigins.includes(origin);
};

/**
 * Applies only a pre-validated, explicit browser CORS allow-list. It never
 * reflects an arbitrary Origin and still permits native/mobile requests that
 * legitimately have no browser Origin header.
 */
export const createHttpCorsMiddleware = (
  environment: HttpSecurityEnvironment = process.env
): RequestHandler => {
  const origins = getHttpCorsOrigins(environment);
  const production = environment.NODE_ENV === "production";
  const options: CorsOptions = {
    origin: true,
    methods: [...HTTP_CORS_METHODS],
    allowedHeaders: [...HTTP_CORS_ALLOWED_HEADERS],
    optionsSuccessStatus: 204,
    maxAge: 600,
  };
  const corsMiddleware = cors(options);

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.header("origin") || undefined;
    if (!isHttpOriginAllowed(origin, origins, production)) {
      return res.status(403).json({ error: "CORS_ORIGIN_FORBIDDEN" });
    }
    return corsMiddleware(req, res, next);
  };
};

/** API-focused Helmet setup: no HTML is served, so CSP is intentionally off. */
export const createHelmetMiddleware = (environment: HttpSecurityEnvironment = process.env): RequestHandler =>
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    // API responses must remain readable by the allowed dashboard and native clients.
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "no-referrer" },
    strictTransportSecurity: environment.NODE_ENV === "production"
      ? { maxAge: 15_552_000, includeSubDomains: true }
      : false,
  });

export const getGlobalRateLimitConfiguration = (
  environment: HttpSecurityEnvironment = process.env
): Pick<RateLimitOptions, "windowMs" | "max"> => ({
  windowMs: positiveInteger(environment.GLOBAL_RATE_LIMIT_WINDOW_MS) ?? 15 * 60 * 1000,
  max: positiveInteger(environment.GLOBAL_RATE_LIMIT_MAX) ??
    (environment.NODE_ENV === "production" ? 300 : 2_000),
});

/** Render forwards one trusted proxy hop by default; never use trust-all. */
export const getTrustProxyHops = (environment: HttpSecurityEnvironment = process.env): number =>
  positiveInteger(environment.TRUST_PROXY_HOPS) ?? 1;

/** Broad flood protection. Capability-specific OTP, Admin, and AI limits remain independent. */
export const createConfiguredGlobalRateLimit = (
  environment: HttpSecurityEnvironment = process.env
): RequestHandler => createRateLimit({
  ...getGlobalRateLimitConfiguration(environment),
  namespace: "global-api",
  error: {
    code: "GLOBAL_RATE_LIMITED",
    message: "Too many requests. Please try again shortly.",
  },
});

export const createNotFoundHandler = (): RequestHandler =>
  (_req, res) => res.status(404).json({ error: "NOT_FOUND" });

const isJsonParseError = (error: unknown): boolean =>
  error instanceof SyntaxError &&
  typeof error === "object" &&
  "status" in error &&
  (error as { status?: unknown }).status === 400;

/** Final safe fallback. Domain routes keep their own stable error contracts. */
export const createSafeGlobalErrorHandler = () =>
  (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(error);
    if (isJsonParseError(error)) {
      return res.status(400).json({ error: "INVALID_REQUEST" });
    }

    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("Unhandled HTTP error", { errorName });
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  };
