import { randomUUID } from "crypto";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  createAiRateLimit,
  createAiRouter,
  getAiRateLimitConfiguration,
} from "../../src/ai/router";

const createTestApp = (max = 10) => {
  const app = express();
  app.use(
    "/ai",
    createAiRouter({
      rateLimit: createAiRateLimit({
        windowMs: 60_000,
        max,
        namespaceSuffix: randomUUID(),
      }),
      registerRoutes: (router) => {
        router.get("/probe", (_req, res) => res.json({ ok: true }));
      },
    })
  );
  return app;
};

const authHeader = () => {
  const token = jwt.sign({ userId: "user-1" }, process.env.JWT_SECRET as string);
  return { Authorization: `Bearer ${token}` };
};

describe("AI router middleware", () => {
  process.env.JWT_SECRET = "ai-router-test-secret";

  it("requires JWT authentication and returns a request ID", async () => {
    const response = await request(createTestApp()).get("/ai/probe").expect(401);

    expect(response.body).toMatchObject({ message: "No token provided" });
    expect(response.body.requestId).toBe(response.headers["x-request-id"]);
  });

  it("honours a safe caller request ID after authentication", async () => {
    const requestId = "caller_request_123";
    const response = await request(createTestApp())
      .get("/ai/probe")
      .set(authHeader())
      .set("X-Request-Id", requestId)
      .expect(200);

    expect(response.headers["x-request-id"]).toBe(requestId);
    expect(response.body).toEqual({ ok: true });
  });

  it("uses a separately namespaced AI rate-limit error contract", async () => {
    const app = createTestApp(1);
    await request(app).get("/ai/probe").set(authHeader()).expect(200);
    const response = await request(app).get("/ai/probe").set(authHeader()).expect(429);

    expect(response.headers["retry-after"]).toBeDefined();
    expect(response.body).toMatchObject({
      code: "AI_RATE_LIMITED",
      retryable: true,
      requestId: response.headers["x-request-id"],
    });
  });

  it("limits authenticated AI users even when their source IP changes", async () => {
    const app = createTestApp(1);
    await request(app)
      .get("/ai/probe")
      .set(authHeader())
      .set("X-Forwarded-For", "198.51.100.10")
      .expect(200);
    await request(app)
      .get("/ai/probe")
      .set(authHeader())
      .set("X-Forwarded-For", "198.51.100.11")
      .expect(429);
  });

  it("uses development defaults and production defaults unless explicitly overridden", () => {
    expect(getAiRateLimitConfiguration({ NODE_ENV: "development" })).toEqual({
      windowMs: 600_000,
      max: 100,
    });
    expect(getAiRateLimitConfiguration({ NODE_ENV: "production" })).toEqual({
      windowMs: 600_000,
      max: 10,
    });
    expect(
      getAiRateLimitConfiguration({
        NODE_ENV: "production",
        AI_RATE_LIMIT_WINDOW_MS: "120000",
        AI_RATE_LIMIT_MAX: "7",
      })
    ).toEqual({ windowMs: 120_000, max: 7 });
  });
});
