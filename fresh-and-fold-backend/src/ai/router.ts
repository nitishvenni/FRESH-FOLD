import { RequestHandler, Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { createRateLimit, RateLimitOptions } from "../middleware/rateLimit";
import { logAiDiagnostic } from "./diagnostics";
import { aiErrorHandler, attachAiRequestId } from "./errors";
import { getAiInteractionUserId, recordAiInteraction } from "./interactionAnalytics";

export type AiRateLimitOptions = Omit<RateLimitOptions, "namespace" | "error"> & {
  /** Optional suffix lets isolated tests avoid sharing an in-memory bucket. */
  namespaceSuffix?: string;
};

const createScopedAiRateLimit = (
  options: AiRateLimitOptions,
  namespace: string,
  onRejected?: RateLimitOptions["onRejected"]
): RequestHandler =>
  createRateLimit({
    ...options,
    keyStrategy: "user",
    namespace,
    error: {
      code: "AI_RATE_LIMITED",
      message: "Too many AI requests. Please try again shortly.",
      retryable: true,
    },
    ...(onRejected ? { onRejected } : {}),
  });

/**
 * Creates a separately namespaced AI limiter. Production limits are intentionally
 * supplied by the capability-mounting phase rather than hard-coded in Phase A.
 */
export const createAiRateLimit = (options: AiRateLimitOptions): RequestHandler =>
  createScopedAiRateLimit(options, `ai${options.namespaceSuffix ? `:${options.namespaceSuffix}` : ""}`, (req, res) => {
      const userId = getAiInteractionUserId(req);
      const capability = req.path.startsWith("/garments/") ? "garment_recognition"
        : req.path.startsWith("/fabric/") ? "fabric_identification"
        : req.path.startsWith("/stain/") ? "stain_detection"
        : req.path.startsWith("/care-label/") ? "care_label_reader"
        : req.path.startsWith("/booking/") ? "natural_language_booking" : null;
      if (userId && capability) void recordAiInteraction({ capability, userId,
        requestId: String(res.locals.aiRequestId || ""), outcome: "rate_limited", confidenceBucket: "unavailable",
        modelAlias: capability === "natural_language_booking" ? "text" : "vision", errorCode: "AI_RATE_LIMITED" });
  });

const DEFAULT_AI_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const DEVELOPMENT_AI_RATE_LIMIT_MAX = 100;
const PRODUCTION_AI_RATE_LIMIT_MAX = 10;
const DEVELOPMENT_AI_EVENT_RATE_LIMIT_MAX = 200;
const PRODUCTION_AI_EVENT_RATE_LIMIT_MAX = 60;

const positiveIntegerFromEnvironment = (value: string | undefined): number | undefined => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const getAiRateLimitConfiguration = (
  environment: NodeJS.ProcessEnv = process.env
): Pick<AiRateLimitOptions, "windowMs" | "max"> => {
  const windowMs =
    positiveIntegerFromEnvironment(environment.AI_RATE_LIMIT_WINDOW_MS) ??
    DEFAULT_AI_RATE_LIMIT_WINDOW_MS;
  const max =
    positiveIntegerFromEnvironment(environment.AI_RATE_LIMIT_MAX) ??
    (environment.NODE_ENV === "production"
      ? PRODUCTION_AI_RATE_LIMIT_MAX
      : DEVELOPMENT_AI_RATE_LIMIT_MAX);

  return { windowMs, max };
};

export const createConfiguredAiRateLimit = (
  environment: NodeJS.ProcessEnv = process.env
): RequestHandler => createAiRateLimit(getAiRateLimitConfiguration(environment));

export const getAiEventRateLimitConfiguration = (
  environment: NodeJS.ProcessEnv = process.env
): Pick<AiRateLimitOptions, "windowMs" | "max"> => ({
  windowMs: positiveIntegerFromEnvironment(environment.AI_EVENT_RATE_LIMIT_WINDOW_MS) ??
    positiveIntegerFromEnvironment(environment.AI_RATE_LIMIT_WINDOW_MS) ?? DEFAULT_AI_RATE_LIMIT_WINDOW_MS,
  max: positiveIntegerFromEnvironment(environment.AI_EVENT_RATE_LIMIT_MAX) ??
    (environment.NODE_ENV === "production" ? PRODUCTION_AI_EVENT_RATE_LIMIT_MAX : DEVELOPMENT_AI_EVENT_RATE_LIMIT_MAX),
});

/** Metadata events have a separate budget and never consume inference quota. */
export const createAiEventRateLimit = (options: AiRateLimitOptions): RequestHandler =>
  createScopedAiRateLimit(options, `ai:events${options.namespaceSuffix ? `:${options.namespaceSuffix}` : ""}`);

export const createConfiguredAiEventRateLimit = (
  environment: NodeJS.ProcessEnv = process.env
): RequestHandler => {
  const options = getAiEventRateLimitConfiguration(environment);
  return createAiEventRateLimit(options);
};

type AiRouterOptions = {
  rateLimit: RequestHandler;
  eventRateLimit?: RequestHandler;
  registerRoutes?: (router: Router) => void;
};

/**
 * Shared AI middleware chain. Phase A intentionally does not invoke this from
 * src/index.ts, so no production AI endpoint exists until a later capability phase.
 */
export const createAiRouter = ({ rateLimit, eventRateLimit, registerRoutes }: AiRouterOptions): Router => {
  const router = Router();
  router.use(attachAiRequestId);
  router.use(authMiddleware);
  router.use((_req, res, next) => {
    logAiDiagnostic({
      requestId: res.locals.aiRequestId,
      stage: "ai_route_reached",
      authenticated: true,
    });
    next();
  });
  if (eventRateLimit) router.use("/events", eventRateLimit);
  router.use((req, res, next) => {
    if (eventRateLimit && (req.path === "/events" || req.path.startsWith("/events/"))) return next();
    return rateLimit(req, res, next);
  });
  registerRoutes?.(router);
  router.use(aiErrorHandler);
  return router;
};
