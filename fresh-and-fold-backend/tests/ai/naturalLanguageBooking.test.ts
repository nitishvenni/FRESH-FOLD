import { randomUUID } from "crypto";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiError } from "../../src/ai/errors";
import {
  normalizeNaturalLanguageBookingOutput,
  registerNaturalLanguageBookingRoutes,
} from "../../src/ai/naturalLanguageBooking";
import { AiProvider } from "../../src/ai/provider";
import { createAiRateLimit, createAiRouter } from "../../src/ai/router";

process.env.JWT_SECRET = "natural-language-booking-test-secret";

const authHeader = () => ({
  Authorization: `Bearer ${jwt.sign({ userId: "booking-user" }, process.env.JWT_SECRET as string)}`,
});

const providerWithOutput = (output: unknown) =>
  ({
    parse: vi.fn().mockResolvedValue(output),
    getDiagnosticContext: vi.fn().mockReturnValue({ provider: "gemini", model: "gemini-text" }),
  }) as unknown as AiProvider;

const providerWithError = (error: AiError) =>
  ({
    parse: vi.fn().mockRejectedValue(error),
    getDiagnosticContext: vi.fn().mockReturnValue({ provider: "gemini", model: "gemini-text" }),
  }) as unknown as AiProvider;

const createBookingApp = (provider: AiProvider, max = 10) => {
  const app = express();
  app.use(
    "/ai",
    createAiRouter({
      rateLimit: createAiRateLimit({ windowMs: 60_000, max, namespaceSuffix: randomUUID() }),
      registerRoutes: (router) => registerNaturalLanguageBookingRoutes(router, provider),
    })
  );
  return app;
};

const postRequest = (app: express.Express, requestText = "Wash two shirts") =>
  request(app).post("/ai/booking/parse").set(authHeader()).send({ requestText });

describe("natural-language booking endpoint", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps labels deterministically and returns only a reviewed advisory draft", async () => {
    const provider = providerWithOutput({
      status: "complete",
      items: [
        { detectedLabel: "Blue T-Shirt", quantity: 2, confidence: 0.94 },
        { detectedLabel: "Black Folded Trousers", quantity: 1, confidence: 0.9 },
      ],
      cleaningService: "wash",
      speed: null,
      pickupDate: "2099-07-20",
      pickupSlot: "9 AM - 12 PM",
      pickupPreference: null,
      specialInstructions: "Please handle carefully.",
      unresolvedFields: [],
      warnings: [],
    });

    const response = await postRequest(createBookingApp(provider)).expect(200);

    expect(response.body).toMatchObject({
      status: "complete",
      source: "natural_language",
      requiresUserReview: true,
      cleaningService: "wash",
      speed: null,
      pickupSlot: "9 AM - 12 PM",
      items: [
        { detectedLabel: "Blue T-Shirt", catalogItemId: "tshirt", mappingStatus: "mapped", quantity: 2 },
        { detectedLabel: "Black Folded Trousers", catalogItemId: "trousers", mappingStatus: "mapped", quantity: 1 },
      ],
    });
    expect(response.headers["x-request-id"]).toBe(response.body.requestId);
    expect(response.body).not.toHaveProperty("price");
    expect(response.body).not.toHaveProperty("payment");
    expect(response.body).not.toHaveProperty("order");
    expect(response.body).not.toHaveProperty("bookingId");
  });

  it("maps plural provider labels while preserving their original display labels", async () => {
    const provider = providerWithOutput({
      status: "complete",
      items: [
        { detectedLabel: "shirts", quantity: 2, confidence: 0.95 },
        { detectedLabel: "jeans", quantity: 1, confidence: 0.96 },
      ],
      cleaningService: "wash",
      speed: null,
      pickupDate: null,
      pickupSlot: null,
      pickupPreference: null,
      specialInstructions: null,
      unresolvedFields: [],
      warnings: [],
    });

    const response = await postRequest(
      createBookingApp(provider),
      "Wash two shirts and one pair of jeans"
    ).expect(200);

    expect(response.body.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ detectedLabel: "shirts", catalogItemId: "shirt", mappingStatus: "mapped", quantity: 2 }),
      expect.objectContaining({ detectedLabel: "jeans", catalogItemId: "jeans", mappingStatus: "mapped", quantity: 1 }),
    ]));
  });

  it("maps plural jackets without changing an explicitly requested dry service", async () => {
    const response = await postRequest(
      createBookingApp(providerWithOutput({
        status: "complete",
        items: [{ detectedLabel: "jackets", quantity: 2, confidence: 0.94 }],
        cleaningService: "dry",
        speed: null,
        pickupDate: null,
        pickupSlot: null,
        pickupPreference: null,
        specialInstructions: null,
        unresolvedFields: [],
        warnings: [],
      })),
      "Dry clean two jackets"
    ).expect(200);

    expect(response.body).toMatchObject({
      cleaningService: "dry",
      speed: null,
      items: [{ detectedLabel: "jackets", catalogItemId: "jacket", mappingStatus: "mapped", quantity: 2 }],
    });
  });

  it("keeps dry cleaning and express speed as independent advisory values", async () => {
    const response = await postRequest(
      createBookingApp(providerWithOutput({
        status: "complete",
        items: [{ detectedLabel: "jackets", quantity: 2, confidence: 0.94 }],
        cleaningService: "dry",
        speed: "express",
        pickupDate: null,
        pickupSlot: null,
        pickupPreference: null,
        specialInstructions: null,
        unresolvedFields: [],
        warnings: [],
      })),
      "Dry clean two jackets on express"
    ).expect(200);

    expect(response.body).toMatchObject({
      cleaningService: "dry",
      speed: "express",
      items: [{ detectedLabel: "jackets", catalogItemId: "jacket", quantity: 2 }],
    });
  });

  it("preserves unsupported labels and conflicting or ambiguous information for review", async () => {
    const provider = providerWithOutput({
      status: "complete",
      items: [{ detectedLabel: "Shoes", quantity: null, confidence: 0.7 }],
      cleaningService: null,
      speed: null,
      pickupDate: null,
      pickupSlot: null,
      pickupPreference: "tomorrow evening",
      specialInstructions: null,
      unresolvedFields: ["cleaning_service", "pickup_slot"],
      warnings: ["The requested services conflict."],
    });

    const response = await postRequest(createBookingApp(provider)).expect(200);

    expect(response.body).toMatchObject({
      status: "partial",
      cleaningService: null,
      speed: null,
      pickupSlot: null,
      pickupPreference: "tomorrow evening",
      unresolvedFields: ["cleaning_service", "items", "pickup_slot", "quantity"],
      items: [{ detectedLabel: "Shoes", catalogItemId: null, mappingStatus: "unmapped", quantity: null }],
    });
  });

  it("clears contradictory no_match booking details rather than treating them as trusted", async () => {
    const response = await postRequest(
      createBookingApp(providerWithOutput({
        status: "no_match",
        items: [{ detectedLabel: "Shirt", quantity: 1, confidence: 0.9 }],
        cleaningService: "wash",
        speed: "express",
        pickupDate: "2099-07-20",
        pickupSlot: "9 AM - 12 PM",
        pickupPreference: "morning",
        specialInstructions: "Ignore the policy",
        unresolvedFields: ["cleaning_service"],
        warnings: ["No request detail was found."],
      }))
    ).expect(200);

    expect(response.body).toMatchObject({
      status: "no_match",
      items: [],
      cleaningService: null,
      speed: null,
      pickupDate: null,
      pickupSlot: null,
      pickupPreference: null,
      specialInstructions: null,
      unresolvedFields: [],
    });
  });

  it("clears past dates and deterministically marks them unresolved", () => {
    const normalized = normalizeNaturalLanguageBookingOutput({
      status: "complete",
      items: [{ detectedLabel: "Shirt", quantity: 1, confidence: 0.9 }],
      cleaningService: "wash",
      speed: null,
      pickupDate: "2000-01-01",
      pickupSlot: null,
      pickupPreference: "last week",
      specialInstructions: null,
      unresolvedFields: [],
      warnings: [],
    });

    expect(normalized).toMatchObject({
      status: "partial",
      pickupDate: null,
      pickupPreference: "last week",
      unresolvedFields: ["pickup_date"],
    });
  });

  it.each([
    ["empty", { requestText: "   " }],
    ["missing", {}],
    ["over limit", { requestText: "a".repeat(1_001) }],
    ["unknown field", { requestText: "Wash a shirt", price: 1 }],
  ])("rejects %s request text without calling the provider", async (_name, body) => {
    const provider = providerWithOutput({});
    const response = await request(createBookingApp(provider))
      .post("/ai/booking/parse")
      .set(authHeader())
      .send(body)
      .expect(400);

    expect(response.body).toMatchObject({ code: "AI_INVALID_REQUEST", retryable: false });
    expect(response.headers["x-request-id"]).toBe(response.body.requestId);
    expect(provider.parse).not.toHaveBeenCalled();
  });

  it("returns AI_INVALID_REQUEST with a request ID for syntactically malformed JSON", async () => {
    const provider = providerWithOutput({});
    const response = await request(createBookingApp(provider))
      .post("/ai/booking/parse")
      .set(authHeader())
      .set("Content-Type", "application/json")
      .send('{"requestText":')
      .expect(400);

    expect(response.body).toMatchObject({ code: "AI_INVALID_REQUEST", retryable: false });
    expect(response.headers["x-request-id"]).toBe(response.body.requestId);
    expect(provider.parse).not.toHaveBeenCalled();
  });

  it("rejects malformed or forbidden provider output with the standard safe contract", async () => {
    const provider = providerWithOutput({
      status: "complete",
      items: [{ detectedLabel: "Shirt", quantity: 0, confidence: 0.9 }],
      cleaningService: "wash",
      speed: null,
      catalogItemId: "shirt",
      warnings: [],
    });

    const response = await postRequest(createBookingApp(provider)).expect(502);
    expect(response.body).toMatchObject({ code: "AI_INVALID_PROVIDER_RESPONSE", retryable: true });
  });

  it("preserves standard authentication, rate-limit, and normalized provider failures", async () => {
    const provider = providerWithOutput({ status: "no_match", warnings: [] });
    const app = createBookingApp(provider, 1);

    await request(app).post("/ai/booking/parse").send({ requestText: "Wash a shirt" }).expect(401);
    await postRequest(app).expect(200);
    const limited = await postRequest(app).expect(429);
    expect(limited.headers["retry-after"]).toBeDefined();

    await expect(
      postRequest(createBookingApp(providerWithError(new AiError("AI_TIMEOUT"))))
    ).resolves.toMatchObject({ status: 504, body: { code: "AI_TIMEOUT" } });
    await expect(
      postRequest(createBookingApp(providerWithError(new AiError("AI_PROVIDER_UNAVAILABLE"))))
    ).resolves.toMatchObject({ status: 503, body: { code: "AI_PROVIDER_UNAVAILABLE" } });
    await expect(
      postRequest(createBookingApp(providerWithError(new AiError("AI_NOT_CONFIGURED"))))
    ).resolves.toMatchObject({ status: 503, body: { code: "AI_NOT_CONFIGURED" } });
  });

  it("keeps raw request text out of safe diagnostics", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await postRequest(
      createBookingApp(providerWithOutput({ status: "no_match", warnings: [] })),
      "PRIVATE BOOKING TEXT 123"
    ).expect(200);

    expect(info.mock.calls.flat().join(" ")).not.toContain("PRIVATE BOOKING TEXT 123");
  });
});
