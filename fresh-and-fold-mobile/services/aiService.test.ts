import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getItem: vi.fn(),
  fetch: vi.fn(),
  append: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: mocks.getItem },
}));

vi.mock("expo-constants", () => ({
  default: { expoConfig: { extra: { apiBaseUrl: "https://api.test" } } },
}));

class MockFormData {
  append = mocks.append;
}

vi.stubGlobal("FormData", MockFormData);
vi.stubGlobal("fetch", mocks.fetch);

import {
  AiServiceError,
  analyzeCareLabel,
  analyzeFabric,
  analyzeStain,
  parseNaturalLanguageBooking,
  reportAiInteractionEvent,
} from "./aiService";

const response = (body: unknown, status = 200, requestId = "fabric_request_123") => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: vi.fn().mockReturnValue(requestId) },
  json: vi.fn().mockResolvedValue(body),
});

describe("Fabric Identification transport", () => {
  beforeEach(() => {
    mocks.getItem.mockResolvedValue("Bearer mobile-token");
    mocks.fetch.mockReset();
    mocks.append.mockReset();
  });

  it("uploads a normalized image to the provider-agnostic fabric endpoint", async () => {
    mocks.fetch.mockResolvedValue(
      response({
        status: "complete",
        candidates: [{ fabric: "denim", confidence: 0.94 }],
        careGuidance: { washing: null, drying: null, ironing: null, serviceRecommendation: null },
        warnings: [],
        requestId: "fabric_request_123",
        requiresUserReview: true,
      })
    );

    await analyzeFabric({ uri: "file:///scan.jpg", name: "scan.jpg", type: "image/jpeg" });

    expect(mocks.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/ai\/fabric\/analyze$/),
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer mobile-token" },
        body: expect.any(MockFormData),
      })
    );
    expect(mocks.append).toHaveBeenCalledWith(
      "image",
      expect.objectContaining({ uri: "file:///scan.jpg", type: "image/jpeg" })
    );
  });

  it("preserves the normalized error status and request ID without provider details", async () => {
    mocks.fetch.mockResolvedValue(
      response(
        {
          code: "AI_TIMEOUT",
          message: "The AI request timed out. Please try again.",
          retryable: true,
          requestId: "body_fabric_request_456",
        },
        504,
        "header_fabric_request_456"
      )
    );

    await expect(
      analyzeFabric({ uri: "file:///scan.jpg", name: "scan.jpg", type: "image/jpeg" })
    ).rejects.toMatchObject({
      code: "AI_TIMEOUT",
      status: 504,
      requestId: "body_fabric_request_456",
    } satisfies Partial<AiServiceError>);
  });

  it("uploads a normalized image to the provider-agnostic stain endpoint", async () => {
    mocks.fetch.mockResolvedValue(
      response({
        status: "no_match",
        stain: null,
        confidence: null,
        candidates: [],
        careGuidance: { cleaningRecommendation: null, specialTreatment: null, safetyNotes: [], serviceRecommendation: null },
        warnings: [],
        requestId: "stain_request_123",
        requiresUserReview: true,
      })
    );

    await analyzeStain({ uri: "file:///stain.jpg", name: "stain.jpg", type: "image/jpeg" });

    expect(mocks.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/ai\/stain\/analyze$/),
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer mobile-token" },
        body: expect.any(MockFormData),
      })
    );
    expect(mocks.append).toHaveBeenCalledWith(
      "image",
      expect.objectContaining({ uri: "file:///stain.jpg", type: "image/jpeg" })
    );
  });

  it("uploads a normalized image to the provider-agnostic care-label endpoint", async () => {
    mocks.fetch.mockResolvedValue(
      response({
        status: "partial",
        extractedText: "Machine wash",
        readings: [],
        unreadableRegions: ["Lower edge"],
        warnings: [],
        requestId: "care_label_request_123",
        requiresUserReview: true,
      })
    );

    await analyzeCareLabel({ uri: "file:///care-label.jpg", name: "care-label.jpg", type: "image/jpeg" });

    expect(mocks.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/ai\/care-label\/analyze$/),
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer mobile-token" },
        body: expect.any(MockFormData),
      })
    );
    expect(mocks.append).toHaveBeenCalledWith(
      "image",
      expect.objectContaining({ uri: "file:///care-label.jpg", type: "image/jpeg" })
    );
  });

  it("sends bounded typed text to the provider-agnostic natural-language endpoint", async () => {
    mocks.fetch.mockResolvedValue(
      response({
        status: "partial",
        warnings: [],
        requestId: "booking_request_123",
        requiresUserReview: true,
        source: "natural_language",
        items: [],
        cleaningService: null,
        speed: null,
        pickupDate: null,
        pickupSlot: null,
        pickupPreference: "tomorrow evening",
        specialInstructions: null,
        unresolvedFields: ["items", "pickup_slot"],
      })
    );

    await parseNaturalLanguageBooking("Wash my shirts tomorrow evening");

    expect(mocks.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/ai\/booking\/parse$/),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer mobile-token",
        }),
        body: JSON.stringify({ requestText: "Wash my shirts tomorrow evening", source: "typed" }),
      })
    );
  });

  it("sends only bounded metadata for a non-blocking lifecycle event", async () => {
    mocks.fetch.mockResolvedValue(response({ success: true }));
    reportAiInteractionEvent({ requestId: "booking_request_123", event: "reviewed", correctionCount: 2 });
    await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    expect(mocks.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/ai\/events$/), expect.objectContaining({ body: JSON.stringify({ requestId: "booking_request_123", event: "reviewed", correctionCount: 2 }) }));
    expect(JSON.stringify(mocks.fetch.mock.calls[0][1])).not.toMatch(/transcript|image|requestText|cleaningService|speed/i);
  });

  it("preserves invalid request error details without exposing provider data", async () => {
    mocks.fetch.mockResolvedValue(
      response(
        {
          code: "AI_INVALID_REQUEST",
          message: "Provide a valid booking request.",
          retryable: false,
          requestId: "booking_request_456",
        },
        400,
        "header_booking_request_456"
      )
    );

    await expect(parseNaturalLanguageBooking("   ")).rejects.toMatchObject({
      code: "AI_INVALID_REQUEST",
      status: 400,
      requestId: "booking_request_456",
    } satisfies Partial<AiServiceError>);
  });
});
