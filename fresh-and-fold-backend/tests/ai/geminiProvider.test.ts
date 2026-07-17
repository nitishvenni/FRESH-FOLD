import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { mapDetectedGarment } from "../../src/ai/catalog";
import { GarmentModelOutputSchema } from "../../src/ai/contracts";
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

describe("GeminiInteractionsProvider", () => {
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

  it("normalizes a timeout without exposing provider details", async () => {
    const timeout = new Error("request timed out");
    timeout.name = "TimeoutError";
    const provider = configuredProvider({ interactions: { create: vi.fn().mockRejectedValue(timeout) } });

    await expect(provider.parse(providerRequest)).rejects.toMatchObject<Partial<AiError>>({
      code: "AI_TIMEOUT",
    });
  });

  it("normalizes Gemini quota and availability failures with no fallback", async () => {
    const quota = Object.assign(new Error("quota exceeded"), { status: 429 });
    const create = vi.fn().mockRejectedValue(quota);
    const provider = configuredProvider({ interactions: { create } });

    await expect(provider.parse(providerRequest)).rejects.toMatchObject<Partial<AiError>>({
      code: "AI_PROVIDER_UNAVAILABLE",
    });
    expect(create).toHaveBeenCalledTimes(1);
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
