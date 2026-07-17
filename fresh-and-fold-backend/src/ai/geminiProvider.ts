import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { AiProviderConfig, getAiConfig, requireAiModel } from "./config";
import { AiError } from "./errors";
import { AiProvider, StructuredAiRequest } from "./provider";

type AnySchema = z.ZodType;

type GeminiInteraction = {
  output_text?: string;
};

export type GeminiInteractionsClient = {
  interactions: {
    create: (request: unknown, options?: unknown) => Promise<GeminiInteraction>;
  };
};

const createGeminiClient = (apiKey: string): GeminiInteractionsClient =>
  new GoogleGenAI({ apiKey }) as unknown as GeminiInteractionsClient;

const isTimeout = (error: unknown) => {
  const name = error instanceof Error ? error.name : "";
  return name === "AbortError" || name === "APIConnectionTimeoutError" || name === "TimeoutError";
};

/**
 * Backend-only Gemini Interactions adapter. It sends transient inline image
 * data, asks Gemini for JSON Schema-constrained output, and always validates
 * the parsed JSON against the application Zod schema before returning it.
 */
export class GeminiInteractionsProvider implements AiProvider {
  private client: GeminiInteractionsClient | undefined;

  constructor(
    private readonly config: AiProviderConfig = getAiConfig().gemini,
    timeoutMs: number = getAiConfig().timeoutMs,
    client?: GeminiInteractionsClient
  ) {
    this.timeoutMs = timeoutMs;
    this.client = client;
  }

  private readonly timeoutMs: number;

  async parse<TSchema extends AnySchema>(
    request: StructuredAiRequest<TSchema>
  ): Promise<z.output<TSchema>> {
    const model = requireAiModel(this.config, request.modality);
    const client = this.client ?? createGeminiClient(this.config.apiKey as string);
    this.client = client;

    try {
      const response = await client.interactions.create(
        {
          model,
          system_instruction: request.instructions,
          input: [
            { type: "text", text: request.input.text },
            ...(request.input.images ?? []).map((image) => ({
              type: "image",
              data: image.data.toString("base64"),
              mime_type: image.mimeType,
            })),
          ],
          response_format: [
            {
              type: "text",
              mime_type: "application/json",
              schema: z.toJSONSchema(request.schema),
            },
          ],
          store: false,
        },
        { timeout_ms: this.timeoutMs, maxRetries: 0 }
      );

      if (typeof response.output_text !== "string") {
        throw new AiError("AI_INVALID_PROVIDER_RESPONSE");
      }

      let output: unknown;
      try {
        output = JSON.parse(response.output_text);
      } catch {
        throw new AiError("AI_INVALID_PROVIDER_RESPONSE");
      }

      const parsed = request.schema.safeParse(output);
      if (!parsed.success) {
        throw new AiError("AI_INVALID_PROVIDER_RESPONSE");
      }

      return parsed.data;
    } catch (error) {
      if (error instanceof AiError) {
        throw error;
      }

      if (isTimeout(error)) {
        throw new AiError("AI_TIMEOUT");
      }

      // Includes Gemini quota/rate-limit, network, and service errors. There is no fallback.
      throw new AiError("AI_PROVIDER_UNAVAILABLE");
    }
  }
}
