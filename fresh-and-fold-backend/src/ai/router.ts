import { RequestHandler, Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { createRateLimit, RateLimitOptions } from "../middleware/rateLimit";
import { logAiDiagnostic } from "./diagnostics";
import { aiErrorHandler, attachAiRequestId } from "./errors";

export type AiRateLimitOptions = Omit<RateLimitOptions, "namespace" | "error"> & {
  /** Optional suffix lets isolated tests avoid sharing an in-memory bucket. */
  namespaceSuffix?: string;
};

/**
 * Creates a separately namespaced AI limiter. Production limits are intentionally
 * supplied by the capability-mounting phase rather than hard-coded in Phase A.
 */
export const createAiRateLimit = (options: AiRateLimitOptions): RequestHandler =>
  createRateLimit({
    ...options,
    keyStrategy: "user",
    namespace: `ai${options.namespaceSuffix ? `:${options.namespaceSuffix}` : ""}`,
    error: {
      code: "AI_RATE_LIMITED",
      message: "Too many AI requests. Please try again shortly.",
      retryable: true,
    },
  });

const DEFAULT_AI_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const DEVELOPMENT_AI_RATE_LIMIT_MAX = 100;
const PRODUCTION_AI_RATE_LIMIT_MAX = 10;

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

type AiRouterOptions = {
  rateLimit: RequestHandler;
  registerRoutes?: (router: Router) => void;
};

/**
 * Shared AI middleware chain. Phase A intentionally does not invoke this from
 * src/index.ts, so no production AI endpoint exists until a later capability phase.
 */
export const createAiRouter = ({ rateLimit, registerRoutes }: AiRouterOptions): Router => {
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
  router.use(rateLimit);
  registerRoutes?.(router);
  router.use(aiErrorHandler);
  return router;
};
