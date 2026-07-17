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

import { AiServiceError, analyzeFabric } from "./aiService";

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
});
