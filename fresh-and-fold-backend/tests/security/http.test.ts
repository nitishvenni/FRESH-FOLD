import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetRateLimitsForTests } from "../../src/middleware/rateLimit";
import {
  createConfiguredGlobalRateLimit,
  createHelmetMiddleware,
  createHttpCorsMiddleware,
  createNotFoundHandler,
  createSafeGlobalErrorHandler,
  getHttpCorsOrigins,
  isHttpOriginAllowed,
} from "../../src/security/http";

const productionEnv = {
  NODE_ENV: "production",
  HTTP_CORS_ORIGINS: "https://admin.example.com, https://ops.example.com",
} as const;

const createTestApp = (rateEnvironment: Record<string, string> = {}) => {
  const app = express();
  app.set("trust proxy", 1);
  app.use(createHelmetMiddleware(productionEnv));
  app.use(createHttpCorsMiddleware(productionEnv));
  app.use(createConfiguredGlobalRateLimit({ NODE_ENV: "production", ...rateEnvironment }));
  app.use(express.json({ limit: "100kb" }));
  app.get("/ok", (_req, res) => res.json({ ok: true }));
  app.get("/throws", () => { throw new Error("/internal/filesystem/path"); });
  app.use(createNotFoundHandler());
  app.use(createSafeGlobalErrorHandler());
  return app;
};

describe("HTTP security boundary", () => {
  beforeEach(() => __resetRateLimitsForTests());

  it("accepts only configured production browser origins and supports native no-Origin requests", async () => {
    const app = createTestApp();

    const allowed = await request(app).get("/ok").set("Origin", "https://admin.example.com").expect(200);
    expect(allowed.headers["access-control-allow-origin"]).toBe("https://admin.example.com");

    await request(app).get("/ok").set("Origin", "https://untrusted.example").expect(403, { error: "CORS_ORIGIN_FORBIDDEN" });
    const native = await request(app).get("/ok").expect(200);
    expect(native.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("handles allowed browser preflight with the exact API methods and headers", async () => {
    const response = await request(createTestApp())
      .options("/admin/orders")
      .set("Origin", "https://admin.example.com")
      .set("Access-Control-Request-Method", "PATCH")
      .set("Access-Control-Request-Headers", "authorization,content-type")
      .expect(204);

    expect(response.headers["access-control-allow-origin"]).toBe("https://admin.example.com");
    expect(response.headers["access-control-allow-methods"]).toContain("PATCH");
    expect(response.headers["access-control-allow-headers"]).toMatch(/authorization/i);
    expect(response.headers["access-control-allow-headers"]).toMatch(/content-type/i);
  });

  it("adds API-safe Helmet headers", async () => {
    const response = await request(createTestApp()).get("/ok").expect(200);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["strict-transport-security"]).toContain("max-age=15552000");
  });

  it("enforces a broad limiter without changing route-specific policies", async () => {
    const app = createTestApp({ GLOBAL_RATE_LIMIT_MAX: "2", GLOBAL_RATE_LIMIT_WINDOW_MS: "60000" });
    await request(app).get("/ok").expect(200);
    await request(app).get("/ok").expect(200);
    const limited = await request(app).get("/ok").expect(429);
    expect(limited.body).toMatchObject({ code: "GLOBAL_RATE_LIMITED", message: "Too many requests. Please try again shortly.", retryable: true });
    expect(limited.body.retryAfterSeconds).toEqual(expect.any(Number));
  });

  it("returns generic 404 and internal errors without route or stack details", async () => {
    await request(createTestApp()).get("/unknown-route").expect(404, { error: "NOT_FOUND" });
    const response = await request(createTestApp()).get("/throws").expect(500, { error: "INTERNAL_SERVER_ERROR" });
    expect(response.text).not.toContain("filesystem");
    expect(response.text).not.toContain("stack");
  });

  it("rejects a missing production allow-list and never permits arbitrary origins", () => {
    expect(() => getHttpCorsOrigins({ NODE_ENV: "production" })).toThrow("HTTP_CORS_ORIGINS");
    expect(isHttpOriginAllowed("https://untrusted.example", ["https://admin.example.com"], true)).toBe(false);
    expect(isHttpOriginAllowed(undefined, [], true)).toBe(true);
  });
});
