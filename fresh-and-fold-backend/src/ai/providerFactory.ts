import { AiConfig, getAiConfig } from "./config";
import { AiError } from "./errors";
import { GeminiInteractionsProvider } from "./geminiProvider";
import { AiProvider, OpenAiResponsesProvider, StructuredAiRequest } from "./provider";
import { z } from "zod";

class NotConfiguredAiProvider implements AiProvider {
  async parse<TSchema extends z.ZodType>(
    _request: StructuredAiRequest<TSchema>
  ): Promise<z.output<TSchema>> {
    throw new AiError("AI_NOT_CONFIGURED");
  }
}

/** Selects exactly one backend provider. Invalid selections never fall back. */
export const createAiProvider = (config: AiConfig = getAiConfig()): AiProvider => {
  switch (config.provider) {
    case "openai":
      return new OpenAiResponsesProvider(config.openai, undefined, config.timeoutMs);
    case "gemini":
      return new GeminiInteractionsProvider(config.gemini, config.timeoutMs);
    default:
      return new NotConfiguredAiProvider();
  }
};
