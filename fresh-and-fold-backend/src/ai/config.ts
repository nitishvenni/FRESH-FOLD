import { AiError } from "./errors";

export type AiModelModality = "vision" | "text";

export type AiProviderName = "openai" | "gemini";

export type AiProviderConfig = {
  apiKey?: string;
  visionModel?: string;
  textModel?: string;
};

export type AiConfig = {
  /** Defaults to OpenAI when AI_PROVIDER is omitted for backwards compatibility. */
  provider: string;
  openai: AiProviderConfig;
  gemini: AiProviderConfig;
  timeoutMs: number;
};

const DEFAULT_TIMEOUT_MS = 30_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 120_000;

const nonEmpty = (value: string | undefined) => value?.trim() || undefined;

const parseTimeout = (value: string | undefined): number => {
  if (!value) return DEFAULT_TIMEOUT_MS;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < MIN_TIMEOUT_MS || parsed > MAX_TIMEOUT_MS) {
    return DEFAULT_TIMEOUT_MS;
  }
  return parsed;
};

export const getAiConfig = (environment: NodeJS.ProcessEnv = process.env): AiConfig => ({
  provider: nonEmpty(environment.AI_PROVIDER)?.toLowerCase() ?? "openai",
  openai: {
    apiKey: nonEmpty(environment.OPENAI_API_KEY),
    visionModel: nonEmpty(environment.AI_VISION_MODEL),
    textModel: nonEmpty(environment.AI_TEXT_MODEL),
  },
  gemini: {
    apiKey: nonEmpty(environment.GEMINI_API_KEY),
    visionModel: nonEmpty(environment.GEMINI_VISION_MODEL),
    textModel: nonEmpty(environment.GEMINI_TEXT_MODEL),
  },
  timeoutMs: parseTimeout(environment.AI_REQUEST_TIMEOUT_MS),
});

export const requireAiModel = (config: AiProviderConfig, modality: AiModelModality): string => {
  const model = modality === "vision" ? config.visionModel : config.textModel;
  if (!config.apiKey || !model) {
    throw new AiError("AI_NOT_CONFIGURED");
  }
  return model;
};
