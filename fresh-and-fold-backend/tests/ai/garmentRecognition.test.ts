import { randomUUID } from "crypto";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { AiError } from "../../src/ai/errors";
import { registerGarmentRecognitionRoutes } from "../../src/ai/garmentRecognition";
import { AI_MAX_IMAGE_BYTES } from "../../src/ai/imageInput";
import { AiProvider } from "../../src/ai/provider";
import { createAiRateLimit, createAiRouter } from "../../src/ai/router";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

const authHeader = () => ({
  Authorization: `Bearer ${jwt.sign({ userId: "garment-user" }, process.env.JWT_SECRET as string)}`,
});

const providerWithOutput = (output: unknown) =>
  ({ parse: vi.fn().mockResolvedValue(output) }) as unknown as AiProvider;

const createGarmentApp = (provider: AiProvider, max = 10) => {
  const app = express();
  app.use(
    "/ai",
    createAiRouter({
      rateLimit: createAiRateLimit({
        windowMs: 60_000,
        max,
        namespaceSuffix: randomUUID(),
      }),
      registerRoutes: (router) => registerGarmentRecognitionRoutes(router, provider),
    })
  );
  return app;
};

const postImage = (app: express.Express, provider?: AiProvider) =>
  request(app)
    .post("/ai/garments/analyze")
    .set(authHeader())
    .attach("image", jpeg, { filename: "garment.jpg", contentType: "image/jpeg" });

describe("garment recognition endpoint", () => {
  process.env.JWT_SECRET = "garment-recognition-test-secret";

  it("maps supported garments and never adds price, weight, booking, order, or payment data", async () => {
    const provider = providerWithOutput({
      status: "complete",
      detections: [{ detectedLabel: "T-Shirt", quantity: 2, confidence: 0.93 }],
      warnings: [],
    });
    const response = await postImage(createGarmentApp(provider)).expect(200);

    expect(response.body).toMatchObject({
      status: "complete",
      requiresUserReview: true,
      detections: [{ catalogItemId: "tshirt", mappingStatus: "mapped", quantity: 2 }],
    });
    expect(response.body).not.toHaveProperty("price");
    expect(response.body).not.toHaveProperty("weight");
    expect(response.body).not.toHaveProperty("booking");
    expect(response.body).not.toHaveProperty("order");
    expect(response.body).not.toHaveProperty("payment");
  });

  it("preserves unsupported and uncertain detections for review", async () => {
    const provider = providerWithOutput({
      status: "partial",
      detections: [
        { detectedLabel: "Silk Saree", quantity: null, confidence: 0.48 },
        { detectedLabel: "Shoes", quantity: 1, confidence: 0.89 },
      ],
      warnings: ["One garment is partially obscured."],
    });
    const response = await postImage(createGarmentApp(provider)).expect(200);

    expect(response.body).toMatchObject({
      status: "partial",
      detections: [
        { detectedLabel: "Silk Saree", quantity: null, catalogItemId: null, mappingStatus: "unmapped" },
        { detectedLabel: "Shoes", catalogItemId: null, mappingStatus: "unmapped" },
      ],
    });
  });

  it.each(["no_match", "unreadable"] as const)("returns honest %s results", async (status) => {
    const provider = providerWithOutput({ status, detections: [], warnings: ["No usable garment detection."] });
    const response = await postImage(createGarmentApp(provider)).expect(200);

    expect(response.body).toMatchObject({ status, detections: [], requiresUserReview: true });
  });

  it("propagates the Phase A request ID into the result", async () => {
    const provider = providerWithOutput({ status: "complete", detections: [], warnings: [] });
    const requestId = "garment_request_123";
    const response = await request(createGarmentApp(provider))
      .post("/ai/garments/analyze")
      .set(authHeader())
      .set("X-Request-Id", requestId)
      .attach("image", jpeg, { filename: "garment.jpg", contentType: "image/jpeg" })
      .expect(200);

    expect(response.headers["x-request-id"]).toBe(requestId);
    expect(response.body.requestId).toBe(requestId);
  });

  it("rejects unauthenticated requests before provider invocation", async () => {
    const provider = providerWithOutput({ status: "complete", detections: [], warnings: [] });
    const response = await request(createGarmentApp(provider))
      .post("/ai/garments/analyze")
      .attach("image", jpeg, { filename: "garment.jpg", contentType: "image/jpeg" })
      .expect(401);

    expect(response.body.requestId).toBe(response.headers["x-request-id"]);
    expect((provider.parse as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it("applies the AI rate limit to the capability route", async () => {
    const provider = providerWithOutput({ status: "complete", detections: [], warnings: [] });
    const app = createGarmentApp(provider, 1);
    await postImage(app).expect(200);
    const response = await postImage(app).expect(429);

    expect(response.body).toMatchObject({ code: "AI_RATE_LIMITED", retryable: true });
  });

  it("rejects invalid, multiple, and oversized uploads without provider calls", async () => {
    const provider = providerWithOutput({ status: "complete", detections: [], warnings: [] });
    const app = createGarmentApp(provider);

    await request(app)
      .post("/ai/garments/analyze")
      .set(authHeader())
      .attach("image", Buffer.from("not a jpeg"), { filename: "fake.jpg", contentType: "image/jpeg" })
      .expect(400);
    await request(app)
      .post("/ai/garments/analyze")
      .set(authHeader())
      .attach("image", jpeg, { filename: "one.jpg", contentType: "image/jpeg" })
      .attach("image", jpeg, { filename: "two.jpg", contentType: "image/jpeg" })
      .expect(400);
    await request(app)
      .post("/ai/garments/analyze")
      .set(authHeader())
      .attach("image", Buffer.alloc(AI_MAX_IMAGE_BYTES + 1), { filename: "large.jpg", contentType: "image/jpeg" })
      .expect(413);

    expect((provider.parse as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it.each([
    ["AI_NOT_CONFIGURED", 503],
    ["AI_TIMEOUT", 504],
    ["AI_INVALID_PROVIDER_RESPONSE", 502],
  ] as const)("serializes %s with the existing AI error contract", async (code, status) => {
    const provider = {
      parse: vi.fn().mockRejectedValue(new AiError(code)),
    } as unknown as AiProvider;
    const response = await postImage(createGarmentApp(provider)).expect(status);

    expect(response.body).toMatchObject({ code, requestId: response.headers["x-request-id"] });
  });
});
