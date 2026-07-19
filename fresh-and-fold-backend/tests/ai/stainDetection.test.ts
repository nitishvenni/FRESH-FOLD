import { randomUUID } from "crypto";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { AiError } from "../../src/ai/errors";
import { AI_MAX_IMAGE_BYTES } from "../../src/ai/imageInput";
import { AiProvider } from "../../src/ai/provider";
import { createAiRateLimit, createAiRouter } from "../../src/ai/router";
import {
  normalizeStainCandidates,
  registerStainDetectionRoutes,
} from "../../src/ai/stainDetection";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const authHeader = () => ({ Authorization: `Bearer ${jwt.sign({ userId: "stain-user" }, process.env.JWT_SECRET as string)}` });
const guidance = {
  cleaningRecommendation: "Blot gently and check the garment care label.",
  specialTreatment: "Avoid heat until the mark is better understood.",
  safetyNotes: ["Test any treatment on an inconspicuous area where appropriate."],
  serviceRecommendation: "wash" as const,
};

const providerWithOutput = (output: unknown) => ({ parse: vi.fn().mockResolvedValue(output) }) as unknown as AiProvider;
const createStainApp = (provider: AiProvider, max = 10) => {
  const app = express();
  app.use("/ai", createAiRouter({
    rateLimit: createAiRateLimit({ windowMs: 60_000, max, namespaceSuffix: randomUUID() }),
    registerRoutes: (router) => registerStainDetectionRoutes(router, provider),
  }));
  return app;
};
const postImage = (app: express.Express) => request(app).post("/ai/stain/analyze").set(authHeader()).attach("image", jpeg, { filename: "stain.jpg", contentType: "image/jpeg" });

describe("stain detection endpoint", () => {
  process.env.JWT_SECRET = "stain-detection-test-secret";

  it.each(["coffee", "tea", "blood", "oil", "ink", "mud", "wine", "grass", "sweat", "tomato_sauce", "makeup", "unknown"] as const)("accepts %s as an approved stain", async (stain) => {
    const provider = providerWithOutput({
      status: stain === "unknown" ? "partial" : "complete",
      stain,
      confidence: stain === "unknown" ? null : 0.82,
      careGuidance: guidance,
      warnings: stain === "unknown" ? ["The visible mark is unclear."] : [],
    });
    const response = await postImage(createStainApp(provider)).expect(200);
    expect(response.body).toMatchObject({ stain, requiresUserReview: true });
  });

  it.each(["partial", "unreadable"] as const)("returns an honest %s result", async (status) => {
    const provider = providerWithOutput({
      status,
      stain: "unknown",
      confidence: null,
      careGuidance: { cleaningRecommendation: null, specialTreatment: null, safetyNotes: [], serviceRecommendation: null },
      warnings: ["No reliable stain classification is available."],
    });
    const response = await postImage(createStainApp(provider)).expect(200);
    expect(response.body).toMatchObject({ status, stain: "unknown" });
  });

  it("normalizes ambiguous oil and mud candidates without forcing a primary stain", async () => {
    const provider = providerWithOutput({
      status: "partial", stain: "unknown", confidence: null,
      candidates: [
        { stain: "mud", confidence: 0.41 },
        { stain: "oil", confidence: 0.63 },
        { stain: "oil", confidence: 0.58 },
      ],
      careGuidance: { cleaningRecommendation: null, specialTreatment: null, safetyNotes: [], serviceRecommendation: null },
      warnings: ["The mark cannot be reliably classified as one stain type."],
    });
    const response = await postImage(createStainApp(provider)).expect(200);
    expect(response.body).toMatchObject({
      stain: "unknown",
      confidence: null,
      candidates: [
        { stain: "oil", confidence: 0.63 },
        { stain: "mud", confidence: 0.41 },
      ],
    });
  });

  it("degrades a single ambiguous candidate to an explicit unknown result", async () => {
    const provider = providerWithOutput({
      status: "partial", stain: "unknown", confidence: null,
      candidates: [{ stain: "oil", confidence: 0.63 }],
      warnings: ["The mark cannot be reliably classified as one stain type."],
    });
    const response = await postImage(createStainApp(provider)).expect(200);
    expect(response.body).toMatchObject({
      status: "partial",
      stain: "unknown",
      confidence: null,
      candidates: [],
    });
  });

  it("degrades duplicate ambiguous candidates that collapse to one distinct stain", async () => {
    const provider = providerWithOutput({
      status: "partial", stain: "unknown", confidence: null,
      candidates: [
        { stain: "oil", confidence: 0.63 },
        { stain: "oil", confidence: 0.48 },
      ],
      warnings: ["The mark cannot be reliably classified as one stain type."],
    });
    const response = await postImage(createStainApp(provider)).expect(200);
    expect(response.body).toMatchObject({
      status: "partial",
      stain: "unknown",
      confidence: null,
      candidates: [],
    });
  });

  it("clears an unknown provider confidence without inventing a replacement", async () => {
    const provider = providerWithOutput({
      status: "partial", stain: "unknown", confidence: 0.82, candidates: [], warnings: [],
    });
    const response = await postImage(createStainApp(provider)).expect(200);
    expect(response.body).toMatchObject({
      status: "partial", stain: "unknown", confidence: null, candidates: [],
    });
  });

  it("bounds three-or-more distinct ambiguous candidates by deterministic ranking", async () => {
    const provider = providerWithOutput({
      status: "partial", stain: "unknown", confidence: null,
      candidates: [
        { stain: "tea", confidence: 0.48 },
        { stain: "oil", confidence: 0.15 },
        { stain: "coffee", confidence: 0.48 },
        { stain: "mud", confidence: 0.64 },
      ],
      warnings: [],
    });
    const response = await postImage(createStainApp(provider)).expect(200);
    expect(response.body.candidates).toEqual([
      { stain: "mud", confidence: 0.64 },
      { stain: "coffee", confidence: 0.48 },
      { stain: "tea", confidence: 0.48 },
    ]);
  });

  it("converts a known primary with distinct competing candidates into advisory possibilities", async () => {
    const provider = providerWithOutput({
      status: "complete", stain: "coffee", confidence: 0.76,
      candidates: [{ stain: "tea", confidence: 0.68 }],
      warnings: [],
    });
    const response = await postImage(createStainApp(provider)).expect(200);
    expect(response.body).toMatchObject({
      status: "partial", stain: "unknown", confidence: null,
      candidates: [
        { stain: "coffee", confidence: 0.76 },
        { stain: "tea", confidence: 0.68 },
      ],
    });
  });

  it("keeps a known primary when candidates only repeat that primary", async () => {
    const provider = providerWithOutput({
      status: "complete", stain: "coffee", confidence: 0.76,
      candidates: [{ stain: "coffee", confidence: 0.62 }],
      warnings: [],
    });
    const response = await postImage(createStainApp(provider)).expect(200);
    expect(response.body).toMatchObject({
      status: "complete", stain: "coffee", confidence: 0.76, candidates: [],
    });
  });

  it("turns a known stain without confidence into an unknown result", async () => {
    const provider = providerWithOutput({ status: "partial", stain: "oil", confidence: null, warnings: [] });
    const response = await postImage(createStainApp(provider)).expect(200);
    expect(response.body).toMatchObject({
      status: "partial", stain: "unknown", confidence: null, candidates: [],
    });
  });

  it("normalizes inconsistent no_match and unreadable provider states safely", async () => {
    const noMatch = await postImage(createStainApp(providerWithOutput({
      status: "no_match", stain: "coffee", confidence: 0.9,
      candidates: [{ stain: "tea", confidence: 0.4 }], warnings: [],
    }))).expect(200);
    expect(noMatch.body).toMatchObject({ status: "no_match", stain: null, confidence: null, candidates: [] });

    const unreadable = await postImage(createStainApp(providerWithOutput({
      status: "unreadable", stain: "oil", confidence: 0.9,
      candidates: [{ stain: "tea", confidence: 0.4 }], warnings: [],
    }))).expect(200);
    expect(unreadable.body).toMatchObject({ status: "unreadable", stain: "unknown", confidence: null, candidates: [] });
  });

  it("keeps candidate duplicate resolution and ordering deterministic", () => {
    expect(normalizeStainCandidates([
      { stain: "tea", confidence: 0.4 },
      { stain: "coffee", confidence: 0.4 },
      { stain: "tea", confidence: 0.6 },
    ])).toEqual([
      { stain: "tea", confidence: 0.6 },
      { stain: "coffee", confidence: 0.4 },
    ]);
  });

  it("returns no stain only as no_match with null stain and confidence", async () => {
    const provider = providerWithOutput({
      status: "no_match", stain: null, confidence: null,
      careGuidance: { cleaningRecommendation: null, specialTreatment: null, safetyNotes: [], serviceRecommendation: null },
      warnings: [],
    });
    const response = await postImage(createStainApp(provider)).expect(200);
    expect(response.body).toMatchObject({ status: "no_match", stain: null, confidence: null });
  });

  it("does not expose catalog, quantity, price, booking, payment, or order data", async () => {
    const provider = providerWithOutput({ status: "complete", stain: "coffee", confidence: 0.9, careGuidance: guidance, warnings: [] });
    const response = await postImage(createStainApp(provider)).expect(200);
    for (const forbiddenKey of ["catalogItemId", "quantity", "price", "booking", "payment", "order"]) {
      expect(response.body).not.toHaveProperty(forbiddenKey);
    }
  });

  it.each([
    ["invalid stain", "complete", "rust", 0.8, []],
    ["confidence below zero", "complete", "coffee", -0.1, []],
    ["confidence above one", "complete", "coffee", 1.1, []],
    ["malformed candidates", "partial", "unknown", null, "not-an-array"],
    ["unsupported candidate", "partial", "unknown", null, [{ stain: "rust", confidence: 0.6 }, { stain: "oil", confidence: 0.5 }]],
  ])("rejects %s from a mocked provider", async (_caseName, status, stain, confidence, candidates) => {
    const response = await postImage(createStainApp(providerWithOutput({ status, stain, confidence, candidates, warnings: [] }))).expect(502);
    expect(response.body.code).toBe("AI_INVALID_PROVIDER_RESPONSE");
  });

  it("propagates the Phase A request ID into the result", async () => {
    const provider = providerWithOutput({ status: "complete", stain: "mud", confidence: 0.85, careGuidance: guidance, warnings: [] });
    const requestId = "stain_request_123";
    const response = await request(createStainApp(provider)).post("/ai/stain/analyze").set(authHeader()).set("X-Request-Id", requestId).attach("image", jpeg, { filename: "stain.jpg", contentType: "image/jpeg" }).expect(200);
    expect(response.headers["x-request-id"]).toBe(requestId);
    expect(response.body.requestId).toBe(requestId);
  });

  it("rejects unauthenticated requests before provider invocation", async () => {
    const provider = providerWithOutput({});
    await request(createStainApp(provider)).post("/ai/stain/analyze").attach("image", jpeg, { filename: "stain.jpg", contentType: "image/jpeg" }).expect(401);
    expect((provider.parse as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it("applies the existing AI rate limit", async () => {
    const provider = providerWithOutput({ status: "no_match", stain: null, confidence: null, careGuidance: { cleaningRecommendation: null, specialTreatment: null, safetyNotes: [], serviceRecommendation: null }, warnings: [] });
    const app = createStainApp(provider, 1);
    await postImage(app).expect(200);
    expect((await postImage(app).expect(429)).body).toMatchObject({ code: "AI_RATE_LIMITED", retryable: true });
  });

  it("rejects invalid, multiple, and oversized uploads before provider invocation", async () => {
    const provider = providerWithOutput({});
    const app = createStainApp(provider);
    await request(app).post("/ai/stain/analyze").set(authHeader()).attach("image", Buffer.from("not an image"), { filename: "fake.jpg", contentType: "image/jpeg" }).expect(400);
    await request(app).post("/ai/stain/analyze").set(authHeader()).attach("image", jpeg, { filename: "one.jpg", contentType: "image/jpeg" }).attach("image", jpeg, { filename: "two.jpg", contentType: "image/jpeg" }).expect(400);
    await request(app).post("/ai/stain/analyze").set(authHeader()).attach("image", Buffer.alloc(AI_MAX_IMAGE_BYTES + 1), { filename: "large.jpg", contentType: "image/jpeg" }).expect(413);
    expect((provider.parse as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it.each([
    ["AI_NOT_CONFIGURED", 503], ["AI_TIMEOUT", 504], ["AI_PROVIDER_UNAVAILABLE", 503], ["AI_INVALID_PROVIDER_RESPONSE", 502],
  ] as const)("serializes %s through the existing AI error contract", async (code, status) => {
    const provider = { parse: vi.fn().mockRejectedValue(new AiError(code)) } as unknown as AiProvider;
    const response = await postImage(createStainApp(provider)).expect(status);
    expect(response.body).toMatchObject({ code, requestId: response.headers["x-request-id"] });
  });
});
