import { randomUUID } from "crypto";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { AiError } from "../../src/ai/errors";
import {
  normalizeFabricCandidates,
  registerFabricIdentificationRoutes,
} from "../../src/ai/fabricIdentification";
import { AI_MAX_IMAGE_BYTES } from "../../src/ai/imageInput";
import { AiProvider } from "../../src/ai/provider";
import { createAiRateLimit, createAiRouter } from "../../src/ai/router";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

const authHeader = () => ({
  Authorization: `Bearer ${jwt.sign({ userId: "fabric-user" }, process.env.JWT_SECRET as string)}`,
});

const guidance = {
  washing: "Use a gentle wash when the care label permits.",
  drying: "Air dry when the care label permits.",
  ironing: "Use the care-label heat setting.",
  serviceRecommendation: "wash" as const,
};

const providerWithOutput = (output: unknown) =>
  ({ parse: vi.fn().mockResolvedValue(output) }) as unknown as AiProvider;

const createFabricApp = (provider: AiProvider, max = 10) => {
  const app = express();
  app.use(
    "/ai",
    createAiRouter({
      rateLimit: createAiRateLimit({
        windowMs: 60_000,
        max,
        namespaceSuffix: randomUUID(),
      }),
      registerRoutes: (router) => registerFabricIdentificationRoutes(router, provider),
    })
  );
  return app;
};

const postImage = (app: express.Express) =>
  request(app)
    .post("/ai/fabric/analyze")
    .set(authHeader())
    .attach("image", jpeg, { filename: "fabric.jpg", contentType: "image/jpeg" });

describe("fabric identification endpoint", () => {
  process.env.JWT_SECRET = "fabric-identification-test-secret";

  it.each([
    "cotton",
    "linen",
    "silk",
    "wool",
    "polyester",
    "denim",
    "rayon",
    "other",
    "unknown",
  ] as const)("accepts %s as an approved fabric candidate", async (fabric) => {
    const provider = providerWithOutput({
      status: "complete",
      candidates: [{ fabric, confidence: 0.82 }],
      careGuidance: guidance,
      warnings: [],
    });

    const response = await postImage(createFabricApp(provider)).expect(200);
    expect(response.body.candidates).toEqual([{ fabric, confidence: 0.82 }]);
  });

  it.each(["partial", "no_match", "unreadable"] as const)(
    "returns an honest %s result",
    async (status) => {
      const provider = providerWithOutput({
        status,
        candidates: [],
        careGuidance: {
          washing: null,
          drying: null,
          ironing: null,
          serviceRecommendation: null,
        },
        warnings: ["No reliable fabric inference is available."],
      });

      const response = await postImage(createFabricApp(provider)).expect(200);
      expect(response.body).toMatchObject({ status, candidates: [], requiresUserReview: true });
    }
  );

  it("deduplicates by highest confidence and sorts candidates deterministically", async () => {
    const provider = providerWithOutput({
      status: "partial",
      candidates: [
        { fabric: "cotton", confidence: 0.61 },
        { fabric: "linen", confidence: 0.8 },
        { fabric: "cotton", confidence: 0.92 },
        { fabric: "denim", confidence: 0.8 },
      ],
      careGuidance: guidance,
      warnings: ["More than one fabric is plausible."],
    });

    const response = await postImage(createFabricApp(provider)).expect(200);
    expect(response.body.candidates).toEqual([
      { fabric: "cotton", confidence: 0.92 },
      { fabric: "denim", confidence: 0.8 },
      { fabric: "linen", confidence: 0.8 },
    ]);
  });

  it("normalizes ties using fabric name after confidence", () => {
    expect(
      normalizeFabricCandidates([
        { fabric: "wool", confidence: 0.8 },
        { fabric: "denim", confidence: 0.8 },
      ])
    ).toEqual([
      { fabric: "denim", confidence: 0.8 },
      { fabric: "wool", confidence: 0.8 },
    ]);
  });

  it("does not expose catalog, price, quantity, booking, payment, or order data", async () => {
    const provider = providerWithOutput({
      status: "complete",
      candidates: [{ fabric: "denim", confidence: 0.94 }],
      careGuidance: guidance,
      warnings: [],
    });
    const response = await postImage(createFabricApp(provider)).expect(200);

    expect(response.body).not.toHaveProperty("catalogItemId");
    expect(response.body).not.toHaveProperty("price");
    expect(response.body).not.toHaveProperty("quantity");
    expect(response.body).not.toHaveProperty("booking");
    expect(response.body).not.toHaveProperty("payment");
    expect(response.body).not.toHaveProperty("order");
  });

  it.each([
    ["invalid fabric", { ...guidance }, [{ fabric: "cashmere", confidence: 0.8 }]],
    ["confidence below zero", { ...guidance }, [{ fabric: "cotton", confidence: -0.1 }]],
    ["confidence above one", { ...guidance }, [{ fabric: "cotton", confidence: 1.1 }]],
    ["malformed guidance", { ...guidance, washing: 42 }, [{ fabric: "cotton", confidence: 0.8 }]],
    ["invalid service recommendation", { ...guidance, serviceRecommendation: "steam" }, [{ fabric: "cotton", confidence: 0.8 }]],
  ])("rejects %s from a mocked provider", async (_caseName, careGuidance, candidates) => {
    const provider = providerWithOutput({
      status: "complete",
      candidates,
      careGuidance,
      warnings: [],
    });

    const response = await postImage(createFabricApp(provider)).expect(502);
    expect(response.body.code).toBe("AI_INVALID_PROVIDER_RESPONSE");
  });

  it("propagates the Phase A request ID into the result", async () => {
    const provider = providerWithOutput({
      status: "complete",
      candidates: [{ fabric: "cotton", confidence: 0.9 }],
      careGuidance: guidance,
      warnings: [],
    });
    const requestId = "fabric_request_123";
    const response = await request(createFabricApp(provider))
      .post("/ai/fabric/analyze")
      .set(authHeader())
      .set("X-Request-Id", requestId)
      .attach("image", jpeg, { filename: "fabric.jpg", contentType: "image/jpeg" })
      .expect(200);

    expect(response.headers["x-request-id"]).toBe(requestId);
    expect(response.body.requestId).toBe(requestId);
  });

  it("rejects unauthenticated requests before provider invocation", async () => {
    const provider = providerWithOutput({});
    await request(createFabricApp(provider))
      .post("/ai/fabric/analyze")
      .attach("image", jpeg, { filename: "fabric.jpg", contentType: "image/jpeg" })
      .expect(401);

    expect((provider.parse as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it("applies the existing AI rate limit", async () => {
    const provider = providerWithOutput({
      status: "complete",
      candidates: [],
      careGuidance: { washing: null, drying: null, ironing: null, serviceRecommendation: null },
      warnings: [],
    });
    const app = createFabricApp(provider, 1);
    await postImage(app).expect(200);
    const response = await postImage(app).expect(429);
    expect(response.body).toMatchObject({ code: "AI_RATE_LIMITED", retryable: true });
  });

  it("rejects invalid, multiple, and oversized uploads before provider invocation", async () => {
    const provider = providerWithOutput({});
    const app = createFabricApp(provider);

    await request(app)
      .post("/ai/fabric/analyze")
      .set(authHeader())
      .attach("image", Buffer.from("not an image"), { filename: "fake.jpg", contentType: "image/jpeg" })
      .expect(400);
    await request(app)
      .post("/ai/fabric/analyze")
      .set(authHeader())
      .attach("image", jpeg, { filename: "one.jpg", contentType: "image/jpeg" })
      .attach("image", jpeg, { filename: "two.jpg", contentType: "image/jpeg" })
      .expect(400);
    await request(app)
      .post("/ai/fabric/analyze")
      .set(authHeader())
      .attach("image", Buffer.alloc(AI_MAX_IMAGE_BYTES + 1), { filename: "large.jpg", contentType: "image/jpeg" })
      .expect(413);

    expect((provider.parse as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it.each([
    ["AI_NOT_CONFIGURED", 503],
    ["AI_TIMEOUT", 504],
    ["AI_PROVIDER_UNAVAILABLE", 503],
    ["AI_INVALID_PROVIDER_RESPONSE", 502],
  ] as const)("serializes %s through the existing AI error contract", async (code, status) => {
    const provider = {
      parse: vi.fn().mockRejectedValue(new AiError(code)),
    } as unknown as AiProvider;
    const response = await postImage(createFabricApp(provider)).expect(status);
    expect(response.body).toMatchObject({ code, requestId: response.headers["x-request-id"] });
  });
});
