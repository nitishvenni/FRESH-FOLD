import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { AiProviderConfig, getAiConfig, requireAiModel } from "./config";
import { logAiDiagnostic, toSafeRawErrorName } from "./diagnostics";
import { AiError } from "./errors";
import { AiProvider, AiProviderDiagnosticContext, StructuredAiRequest } from "./provider";

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

  getDiagnosticContext(modality: "vision" | "text"): AiProviderDiagnosticContext {
    return {
      provider: "gemini",
      ...(modality === "vision" ? { model: this.config.visionModel } : { model: this.config.textModel }),
    };
  }

  async parse<TSchema extends AnySchema>(
    request: StructuredAiRequest<TSchema>
  ): Promise<z.output<TSchema>> {
    const model = requireAiModel(this.config, request.modality);
    const client = this.client ?? createGeminiClient(this.config.apiKey as string);
    this.client = client;

    const providerStartedAtMs = Date.now();
    const providerStartedAt = new Date(providerStartedAtMs).toISOString();
    if (request.requestId) {
      logAiDiagnostic({
        requestId: request.requestId,
        stage: "provider_execution_started",
        provider: "gemini",
        model,
        configuredTimeoutMs: this.timeoutMs,
        providerStartedAt,
      });
    }

    let response: GeminiInteraction;
    try {
      response = await client.interactions.create(
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
    } catch (error) {
      const providerFinishedAtMs = Date.now();
      const normalizedErrorCode =
        error instanceof AiError
          ? error.code
          : isTimeout(error)
            ? "AI_TIMEOUT"
            : "AI_PROVIDER_UNAVAILABLE";

      if (request.requestId) {
        logAiDiagnostic({
          requestId: request.requestId,
          stage: "provider_execution_failed",
          provider: "gemini",
          model,
          configuredTimeoutMs: this.timeoutMs,
          providerStartedAt,
          providerFinishedAt: new Date(providerFinishedAtMs).toISOString(),
          elapsedMs: providerFinishedAtMs - providerStartedAtMs,
          normalizedErrorCode,
          ...(toSafeRawErrorName(error) ? { rawErrorName: toSafeRawErrorName(error) } : {}),
        });
      }

      if (error instanceof AiError) {
        throw error;
      }

      throw new AiError(normalizedErrorCode);
    }

    if (request.requestId) {
      const providerFinishedAtMs = Date.now();
      logAiDiagnostic({
        requestId: request.requestId,
        stage: "provider_execution_completed",
        provider: "gemini",
        model,
        configuredTimeoutMs: this.timeoutMs,
        providerStartedAt,
        providerFinishedAt: new Date(providerFinishedAtMs).toISOString(),
        elapsedMs: providerFinishedAtMs - providerStartedAtMs,
      });
    }

    try {
      if (typeof response.output_text !== "string") {
        if (request.requestId) {
          logAiDiagnostic({
            requestId: request.requestId,
            stage: "provider_output_validation",
            provider: "gemini",
            model,
            validationCategory: "json_parse_failed",
          });
        }
        throw new AiError("AI_INVALID_PROVIDER_RESPONSE");
      }

      let output: unknown;
      try {
        output = JSON.parse(response.output_text);
      } catch {
        if (request.requestId) {
          logAiDiagnostic({
            requestId: request.requestId,
            stage: "provider_output_validation",
            provider: "gemini",
            model,
            validationCategory: "json_parse_failed",
          });
        }
        throw new AiError("AI_INVALID_PROVIDER_RESPONSE");
      }

      const parsed = request.schema.safeParse(output);
      if (!parsed.success) {
        if (request.requestId) {
          logAiDiagnostic({
            requestId: request.requestId,
            stage: "provider_output_validation",
            provider: "gemini",
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
          provider: "gemini",
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

      // Includes Gemini quota/rate-limit, network, and service errors. There is no fallback.
      throw new AiError("AI_PROVIDER_UNAVAILABLE");
    }
  }
}
