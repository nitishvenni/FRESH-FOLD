import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseInput } from "openai/resources/responses/responses";
import { z } from "zod";
import { AiModelModality, AiProviderConfig, getAiConfig, requireAiModel } from "./config";
import { logAiDiagnostic } from "./diagnostics";
import { AiError } from "./errors";
import type { AiImageInput } from "./imageInput";

type AnySchema = z.ZodType;

type ParsedResponse = {
  output_parsed: unknown;
};

export type OpenAiResponsesClient = {
  responses: {
    parse: (request: unknown) => Promise<ParsedResponse>;
  };
};

export type StructuredAiRequest<TSchema extends AnySchema> = {
  /** Internal correlation ID only; it is not sent to the AI provider. */
  requestId?: string;
  modality: AiModelModality;
  instructions: string;
  input: {
    text: string;
    images?: readonly AiImageInput[];
  };
  schema: TSchema;
  schemaName: string;
};

export type AiProviderDiagnosticContext = {
  provider: string;
  model?: string;
};

export interface AiProvider {
  parse<TSchema extends AnySchema>(request: StructuredAiRequest<TSchema>): Promise<z.output<TSchema>>;
  getDiagnosticContext?(modality: AiModelModality): AiProviderDiagnosticContext;
}

const createOpenAiClient = (apiKey: string, timeoutMs: number): OpenAiResponsesClient =>
  new OpenAI({
    apiKey,
    timeout: timeoutMs,
    maxRetries: 0,
  }) as unknown as OpenAiResponsesClient;

const isTimeout = (error: unknown) => {
  const name = error instanceof Error ? error.name : "";
  return name === "AbortError" || name === "APIConnectionTimeoutError";
};

const toOpenAiResponseInput = (input: StructuredAiRequest<AnySchema>["input"]): ResponseInput =>
  [
    {
      role: "user",
      content: [
        { type: "input_text", text: input.text },
        ...(input.images ?? []).map((image) => ({
          type: "input_image" as const,
          image_url: `data:${image.mimeType};base64,${image.data.toString("base64")}`,
          detail: "auto" as const,
        })),
      ],
    },
  ] as unknown as ResponseInput;

/**
 * Backend-only OpenAI Responses API adapter. Every result is parsed by the SDK
 * with a strict Zod schema and is then validated again before use.
 */
export class OpenAiResponsesProvider implements AiProvider {
  private client: OpenAiResponsesClient | undefined;

  constructor(
    private readonly config: AiProviderConfig = getAiConfig().openai,
    client?: OpenAiResponsesClient,
    private readonly timeoutMs: number = getAiConfig().timeoutMs
  ) {
    this.client = client;
  }

  getDiagnosticContext(modality: AiModelModality): AiProviderDiagnosticContext {
    return {
      provider: "openai",
      ...(modality === "vision" ? { model: this.config.visionModel } : { model: this.config.textModel }),
    };
  }

  async parse<TSchema extends AnySchema>(
    request: StructuredAiRequest<TSchema>
  ): Promise<z.output<TSchema>> {
    const model = requireAiModel(this.config, request.modality);
    const client = this.client ?? createOpenAiClient(this.config.apiKey as string, this.timeoutMs);
    this.client = client;

    try {
      const response = await client.responses.parse({
        model,
        instructions: request.instructions,
        input: toOpenAiResponseInput(request.input),
        store: false,
        text: {
          format: zodTextFormat(request.schema, request.schemaName),
        },
      });
      const parsed = request.schema.safeParse(response.output_parsed);

      if (!parsed.success) {
        if (request.requestId) {
          logAiDiagnostic({
            requestId: request.requestId,
            stage: "provider_output_validation",
            provider: "openai",
            model,
            validationCategory: "schema_failed",
          });
        }
        throw new AiError("AI_INVALID_PROVIDER_RESPONSE");
      }

      if (request.requestId) {
        logAiDiagnostic({
          requestId: request.requestId,
          stage: "provider_output_validation",
          provider: "openai",
          model,
          validationCategory: "success",
        });
      }

      return parsed.data;
    } catch (error) {
      if (error instanceof AiError) {
        throw error;
      }

      if (isTimeout(error)) {
        throw new AiError("AI_TIMEOUT");
      }

      throw new AiError("AI_PROVIDER_UNAVAILABLE");
    }
  }
}
