import { describe, expect, it } from "vitest";
import { getAiConfig } from "../../src/ai/config";
import { AiError } from "../../src/ai/errors";
import { GeminiInteractionsProvider } from "../../src/ai/geminiProvider";
import { createAiProvider } from "../../src/ai/providerFactory";
import { OpenAiResponsesProvider } from "../../src/ai/provider";
import { z } from "zod";

const schema = z.object({ result: z.string() });
const request = {
  modality: "vision" as const,
  instructions: "test",
  input: { text: "test" },
  schema,
  schemaName: "test_result",
};

describe("AI provider selection", () => {
  it("defaults to OpenAI when AI_PROVIDER is absent", () => {
    const config = getAiConfig({
      OPENAI_API_KEY: "openai-key",
      AI_VISION_MODEL: "openai-vision",
      AI_TEXT_MODEL: "openai-text",
    });

    expect(config.provider).toBe("openai");
    expect(createAiProvider(config)).toBeInstanceOf(OpenAiResponsesProvider);
  });

  it("selects Gemini only when explicitly configured", () => {
    const config = getAiConfig({
      AI_PROVIDER: "gemini",
      GEMINI_API_KEY: "gemini-key",
      GEMINI_VISION_MODEL: "gemini-vision",
      GEMINI_TEXT_MODEL: "gemini-text",
    });

    expect(createAiProvider(config)).toBeInstanceOf(GeminiInteractionsProvider);
  });

  it.each([
    [{ AI_PROVIDER: "unsupported" }, "invalid provider"],
    [{ AI_PROVIDER: "gemini" }, "missing Gemini configuration"],
    [{ AI_PROVIDER: "openai" }, "missing OpenAI configuration"],
  ] as const)("returns AI_NOT_CONFIGURED for %s", async (environment) => {
    const provider = createAiProvider(getAiConfig(environment));

    await expect(provider.parse(request)).rejects.toMatchObject<Partial<AiError>>({
      code: "AI_NOT_CONFIGURED",
    });
  });
});
