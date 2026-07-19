import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { mapDetectedGarment } from "../../src/ai/catalog";
import { GarmentModelOutputSchema, StainModelOutputSchema } from "../../src/ai/contracts";
import { AiError } from "../../src/ai/errors";
import { GeminiInteractionsClient, GeminiInteractionsProvider } from "../../src/ai/geminiProvider";
import { OpenAiResponsesProvider } from "../../src/ai/provider";

const schema = z.object({ result: z.string() });
const imageBytes = Buffer.from([0xff, 0xd8, 0xff]);

const providerRequest = {
  modality: "vision" as const,
  instructions: "Extract only structured data.",
  input: {
    text: "Analyze this image.",
    images: [{ mimeType: "image/jpeg", data: imageBytes }],
  },
  schema,
  schemaName: "test_result",
};

const configuredProvider = (client: GeminiInteractionsClient) =>
  new GeminiInteractionsProvider(
    { apiKey: "test-key", visionModel: "gemini-vision", textModel: "gemini-text" },
    12_345,
    client
  );

const timingEvents = (info: ReturnType<typeof vi.spyOn>) =>
  info.mock.calls
    .filter(([prefix]) => prefix === "[ai-diagnostic]")
    .map(([, event]) => JSON.parse(event as string));

describe("GeminiInteractionsProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses Interactions create with inline image input, JSON schema, store false, and Zod validation", async () => {
    const create = vi.fn().mockResolvedValue({ output_text: JSON.stringify({ result: "ok" }) });
    const provider = configuredProvider({ interactions: { create } });

    await expect(provider.parse(providerRequest)).resolves.toEqual({ result: "ok" });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-vision",
        system_instruction: "Extract only structured data.",
        store: false,
        input: [
          { type: "text", text: "Analyze this image." },
          { type: "image", data: imageBytes.toString("base64"), mime_type: "image/jpeg" },
        ],
        response_format: [
          expect.objectContaining({ type: "text", mime_type: "application/json", schema: expect.any(Object) }),
        ],
      }),
      { timeout_ms: 12_345, maxRetries: 0 }
    );
  });

  it("records configured timeout and elapsed time when Gemini completes", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const provider = configuredProvider({
      interactions: { create: vi.fn().mockResolvedValue({ output_text: JSON.stringify({ result: "ok" }) }) },
    });

    await expect(provider.parse({ ...providerRequest, requestId: "gemini_timing_success" })).resolves.toEqual({
      result: "ok",
    });

    const events = timingEvents(info);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requestId: "gemini_timing_success",
          stage: "provider_execution_started",
          provider: "gemini",
          model: "gemini-vision",
          configuredTimeoutMs: 12_345,
          providerStartedAt: expect.any(String),
        }),
        expect.objectContaining({
          requestId: "gemini_timing_success",
          stage: "provider_execution_completed",
          provider: "gemini",
          model: "gemini-vision",
          configuredTimeoutMs: 12_345,
          providerStartedAt: expect.any(String),
          providerFinishedAt: expect.any(String),
          elapsedMs: expect.any(Number),
        }),
      ])
    );
    expect(events.some((event) => "rawErrorName" in event)).toBe(false);
  });

  it("returns AI_NOT_CONFIGURED before making a request when the selected Gemini config is incomplete", async () => {
    const create = vi.fn();
    const provider = new GeminiInteractionsProvider({ visionModel: "gemini-vision" }, 30_000, {
      interactions: { create },
    });

    await expect(provider.parse(providerRequest)).rejects.toMatchObject<Partial<AiError>>({
      code: "AI_NOT_CONFIGURED",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    ["malformed JSON", { output_text: "not-json" }],
    ["schema-invalid JSON", { output_text: JSON.stringify({ result: 42 }) }],
    ["missing output", {}],
  ])("rejects %s provider output", async (_description, response) => {
    const provider = configuredProvider({ interactions: { create: vi.fn().mockResolvedValue(response) } });

    await expect(provider.parse(providerRequest)).rejects.toMatchObject<Partial<AiError>>({
      code: "AI_INVALID_PROVIDER_RESPONSE",
    });
  });

  it("records only safe Zod paths and codes when Gemini structured output fails validation", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const provider = configuredProvider({
      interactions: {
        create: vi.fn().mockResolvedValue({
          output_text: JSON.stringify({
            status: "partial",
            stain: "unknown",
            confidence: null,
            candidates: "secret-provider-output",
            warnings: [],
          }),
        }),
      },
    });

    await expect(
      provider.parse({ ...providerRequest, requestId: "gemini_schema_diagnostics", schema: StainModelOutputSchema })
    ).rejects.toMatchObject<Partial<AiError>>({ code: "AI_INVALID_PROVIDER_RESPONSE" });

    const failure = timingEvents(info).find(
      (event) =>
        event.stage === "gemini_provider_schema_validation" &&
        event.requestId === "gemini_schema_diagnostics"
    );
    expect(failure).toMatchObject({
      requestId: "gemini_schema_diagnostics",
      stage: "gemini_provider_schema_validation",
      status: "partial",
      normalizedErrorCode: "AI_INVALID_PROVIDER_RESPONSE",
      zodIssuePaths: expect.arrayContaining(["candidates"]),
      zodIssueCodes: expect.arrayContaining(["invalid_type"]),
    });
    expect(JSON.stringify(failure)).not.toContain("secret-provider-output");
  });

  it("passes recoverable stain semantics to deterministic application normalization", async () => {
    const output = {
      status: "complete",
      stain: "coffee",
      confidence: 0.76,
      candidates: [{ stain: "tea", confidence: 0.68 }],
      warnings: [],
    };
    const provider = configuredProvider({
      interactions: { create: vi.fn().mockResolvedValue({ output_text: JSON.stringify(output) }) },
    });

    await expect(
      provider.parse({ ...providerRequest, schema: StainModelOutputSchema })
    ).resolves.toEqual(output);
  });

  it("normalizes a timeout without exposing provider details", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const timeout = new Error("request timed out");
    timeout.name = "TimeoutError";
    const provider = configuredProvider({ interactions: { create: vi.fn().mockRejectedValue(timeout) } });

    await expect(provider.parse({ ...providerRequest, requestId: "gemini_timing_timeout" })).rejects.toMatchObject<Partial<AiError>>({
      code: "AI_TIMEOUT",
    });

    expect(timingEvents(info)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requestId: "gemini_timing_timeout",
          stage: "provider_execution_failed",
          provider: "gemini",
          model: "gemini-vision",
          configuredTimeoutMs: 12_345,
          providerStartedAt: expect.any(String),
          providerFinishedAt: expect.any(String),
          elapsedMs: expect.any(Number),
          normalizedErrorCode: "AI_TIMEOUT",
          rawErrorName: "TimeoutError",
        }),
      ])
    );
  });

  it("normalizes Gemini quota and availability failures with no fallback", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const quota = Object.assign(new Error("quota exceeded"), { status: 429 });
    const create = vi.fn().mockRejectedValue(quota);
    const provider = configuredProvider({ interactions: { create } });

    await expect(provider.parse({ ...providerRequest, requestId: "gemini_timing_failure" })).rejects.toMatchObject<Partial<AiError>>({
      code: "AI_PROVIDER_UNAVAILABLE",
    });
    expect(create).toHaveBeenCalledTimes(1);
    const failure = timingEvents(info).find(
      (event) => event.stage === "provider_execution_failed" && event.requestId === "gemini_timing_failure"
    );
    expect(failure).toMatchObject({
      requestId: "gemini_timing_failure",
      configuredTimeoutMs: 12_345,
      normalizedErrorCode: "AI_PROVIDER_UNAVAILABLE",
      rawErrorName: "Error",
    });
    expect(JSON.stringify(failure)).not.toContain("quota exceeded");
  });

  it("produces the same validated garment contract as OpenAI before deterministic mapping", async () => {
    const output = {
      status: "partial",
      detections: [{ detectedLabel: "Silk Saree", quantity: null, confidence: 0.42 }],
      warnings: ["The garment is partially folded."],
    };
    const gemini = configuredProvider({
      interactions: { create: vi.fn().mockResolvedValue({ output_text: JSON.stringify(output) }) },
    });
    const openAi = new OpenAiResponsesProvider(
      { apiKey: "test-key", visionModel: "openai-vision" },
      { responses: { parse: vi.fn().mockResolvedValue({ output_parsed: output }) } },
      30_000
    );
    const garmentRequest = { ...providerRequest, schema: GarmentModelOutputSchema };

    const [geminiOutput, openAiOutput] = await Promise.all([
      gemini.parse(garmentRequest),
      openAi.parse(garmentRequest),
    ]);

    expect(geminiOutput).toEqual(openAiOutput);
    expect(geminiOutput.detections.map(mapDetectedGarment)).toEqual([
      expect.objectContaining({ catalogItemId: null, mappingStatus: "unmapped" }),
    ]);
  });
});
