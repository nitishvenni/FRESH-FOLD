import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AiError } from "../../src/ai/errors";
import { OpenAiResponsesClient, OpenAiResponsesProvider } from "../../src/ai/provider";

const schema = z.object({ result: z.string() });

const configuredProvider = (client: OpenAiResponsesClient) =>
  new OpenAiResponsesProvider(
    {
      apiKey: "test-key",
      visionModel: "vision-model",
      textModel: "text-model",
      timeoutMs: 30_000,
    },
    client
  );

describe("OpenAiResponsesProvider", () => {
  it("uses Responses parse with strict Zod output and validates it again", async () => {
    const parse = vi.fn().mockResolvedValue({ output_parsed: { result: "ok" } });
    const provider = configuredProvider({ responses: { parse } });

    await expect(
      provider.parse({
        modality: "vision",
        instructions: "test instructions",
        input: { text: "test input" },
        schema,
        schemaName: "test_result",
      })
    ).resolves.toEqual({ result: "ok" });

    expect(parse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "vision-model",
        store: false,
        input: expect.arrayContaining([
          expect.objectContaining({
            content: expect.arrayContaining([expect.objectContaining({ type: "input_text", text: "test input" })]),
          }),
        ]),
        text: expect.objectContaining({ format: expect.objectContaining({ name: "test_result" }) }),
      })
    );
  });

  it("fails safely when model configuration is missing", async () => {
    const parse = vi.fn();
    const provider = new OpenAiResponsesProvider(
      { timeoutMs: 30_000 },
      { responses: { parse } }
    );

    await expect(
      provider.parse({
        modality: "vision",
        instructions: "test",
        input: { text: "test" },
        schema,
        schemaName: "test_result",
      })
    ).rejects.toMatchObject<Partial<AiError>>({ code: "AI_NOT_CONFIGURED" });
    expect(parse).not.toHaveBeenCalled();
  });

  it("rejects malformed structured output", async () => {
    const provider = configuredProvider({
      responses: { parse: vi.fn().mockResolvedValue({ output_parsed: { result: 42 } }) },
    });

    await expect(
      provider.parse({
        modality: "text",
        instructions: "test",
        input: { text: "test" },
        schema,
        schemaName: "test_result",
      })
    ).rejects.toMatchObject<Partial<AiError>>({ code: "AI_INVALID_PROVIDER_RESPONSE" });
  });

  it("translates provider timeouts without exposing provider details", async () => {
    const timeout = new Error("connection timed out");
    timeout.name = "APIConnectionTimeoutError";
    const provider = configuredProvider({
      responses: { parse: vi.fn().mockRejectedValue(timeout) },
    });

    await expect(
      provider.parse({
        modality: "text",
        instructions: "test",
        input: { text: "test" },
        schema,
        schemaName: "test_result",
      })
    ).rejects.toMatchObject<Partial<AiError>>({ code: "AI_TIMEOUT" });
  });
});
