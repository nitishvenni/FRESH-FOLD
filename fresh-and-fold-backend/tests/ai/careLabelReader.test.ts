import { randomUUID } from "crypto";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { AiError } from "../../src/ai/errors";
import { AI_MAX_IMAGE_BYTES } from "../../src/ai/imageInput";
import { AiProvider } from "../../src/ai/provider";
import { createAiRateLimit, createAiRouter } from "../../src/ai/router";
import { registerCareLabelReaderRoutes } from "../../src/ai/careLabelReader";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const authHeader = () => ({
  Authorization: `Bearer ${jwt.sign({ userId: "care-label-user" }, process.env.JWT_SECRET as string)}`,
});

const providerWithOutput = (output: unknown) =>
  ({ parse: vi.fn().mockResolvedValue(output) }) as unknown as AiProvider;

const createCareLabelApp = (provider: AiProvider, max = 10) => {
  const app = express();
  app.use("/ai", createAiRouter({
    rateLimit: createAiRateLimit({ windowMs: 60_000, max, namespaceSuffix: randomUUID() }),
    registerRoutes: (router) => registerCareLabelReaderRoutes(router, provider),
  }));
  return app;
};

const postImage = (app: express.Express) =>
  request(app)
    .post("/ai/care-label/analyze")
    .set(authHeader())
    .attach("image", jpeg, { filename: "care-label.jpg", contentType: "image/jpeg" });

const washingReading = {
  category: "washing" as const,
  status: "recognized" as const,
  observedSymbol: "wash" as const,
  observedText: "Machine wash",
  interpretation: "Machine wash only where the physical label permits.",
  confidence: 0.88,
};

describe("care-label reader endpoint", () => {
  process.env.JWT_SECRET = "care-label-test-secret";

  it("returns fixed-category advisory output without service, booking, or price data", async () => {
    const response = await postImage(createCareLabelApp(providerWithOutput({
      status: "complete",
      extractedText: "Machine wash",
      readings: [washingReading],
      unreadableRegions: ["Lower edge"],
      warnings: ["Compare the reading with the physical label."],
    }))).expect(200);

    expect(response.body).toMatchObject({
      status: "partial",
      extractedText: "Machine wash",
      readings: expect.arrayContaining([washingReading]),
      requiresUserReview: true,
    });
    expect(response.body.readings.map((reading: { category: string }) => reading.category)).toEqual([
      "washing", "bleaching", "drying", "ironing", "dry_cleaning",
    ]);
    for (const key of ["serviceRecommendation", "catalogItemId", "price", "booking", "payment", "order"]) {
      expect(response.body).not.toHaveProperty(key);
    }
  });

  it("degrades duplicate conflicting category readings to uncertainty without inventing an instruction", async () => {
    const response = await postImage(createCareLabelApp(providerWithOutput({
      status: "partial",
      readings: [
        washingReading,
        { ...washingReading, observedSymbol: "hand_wash", interpretation: "Hand wash only.", confidence: 0.72 },
      ],
      warnings: [],
    }))).expect(200);

    expect(response.body.readings[0]).toEqual({
      category: "washing", status: "uncertain", observedSymbol: null, observedText: null,
      interpretation: null, confidence: null,
    });
  });

  it("preserves no_match and unreadable results without care directions", async () => {
    const noMatch = await postImage(createCareLabelApp(providerWithOutput({
      status: "no_match", extractedText: "not a label", readings: [washingReading], warnings: [],
    }))).expect(200);
    expect(noMatch.body).toMatchObject({ status: "no_match", extractedText: null });
    expect(noMatch.body.readings.every((reading: { status: string }) => reading.status === "not_shown")).toBe(true);

    const unreadable = await postImage(createCareLabelApp(providerWithOutput({
      status: "unreadable", extractedText: "blurred", readings: [washingReading], warnings: [],
    }))).expect(200);
    expect(unreadable.body).toMatchObject({ status: "unreadable", extractedText: null });
    expect(unreadable.body.readings.every((reading: { status: string }) => reading.status === "unreadable")).toBe(true);
  });

  it("does not log raw extracted label text", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await postImage(createCareLabelApp(providerWithOutput({
      status: "partial", extractedText: "PRIVATE LABEL TEXT", readings: [washingReading], warnings: [],
    }))).expect(200);
    expect(JSON.stringify(info.mock.calls)).not.toContain("PRIVATE LABEL TEXT");
    info.mockRestore();
  });

  it.each([
    ["unsupported symbol", { ...washingReading, observedSymbol: "steam_only" }],
    ["invalid confidence", { ...washingReading, confidence: 1.1 }],
    ["malformed reading", { category: "washing", status: "invalid_status", observedSymbol: "wash" }],
  ])("rejects structurally unusable %s output", async (_description, reading) => {
    const response = await postImage(createCareLabelApp(providerWithOutput({
      status: "complete", readings: [reading], warnings: [],
    }))).expect(502);
    expect(response.body.code).toBe("AI_INVALID_PROVIDER_RESPONSE");
  });

  it("propagates the request ID", async () => {
    const requestId = "care_label_request_123";
    const response = await request(createCareLabelApp(providerWithOutput({
      status: "partial", readings: [washingReading], warnings: [],
    })))
      .post("/ai/care-label/analyze")
      .set(authHeader())
      .set("X-Request-Id", requestId)
      .attach("image", jpeg, { filename: "care-label.jpg", contentType: "image/jpeg" })
      .expect(200);
    expect(response.headers["x-request-id"]).toBe(requestId);
    expect(response.body.requestId).toBe(requestId);
  });

  it("preserves auth, rate-limit, image-validation, and normalized error behavior", async () => {
    const provider = providerWithOutput({ status: "partial", readings: [washingReading], warnings: [] });
    const app = createCareLabelApp(provider, 1);
    await request(app).post("/ai/care-label/analyze").attach("image", jpeg, { filename: "care-label.jpg", contentType: "image/jpeg" }).expect(401);
    expect((provider.parse as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();

    await postImage(app).expect(200);
    await postImage(app).expect(429);

    const invalidApp = createCareLabelApp(providerWithOutput({}));
    await request(invalidApp).post("/ai/care-label/analyze").set(authHeader()).attach("image", Buffer.from("not an image"), { filename: "fake.jpg", contentType: "image/jpeg" }).expect(400);
    await request(invalidApp).post("/ai/care-label/analyze").set(authHeader()).attach("image", Buffer.alloc(AI_MAX_IMAGE_BYTES + 1), { filename: "large.jpg", contentType: "image/jpeg" }).expect(413);

    const timeoutApp = createCareLabelApp({ parse: vi.fn().mockRejectedValue(new AiError("AI_TIMEOUT")) } as unknown as AiProvider);
    await postImage(timeoutApp).expect(504);
  });
});
