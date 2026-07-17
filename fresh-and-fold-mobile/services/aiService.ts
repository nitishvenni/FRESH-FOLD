import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../constants/api";
import type {
  AiErrorCode,
  AiErrorResponse,
  GarmentRecognitionResult,
} from "../types/ai";

const AI_ERROR_CODES: readonly AiErrorCode[] = [
  "AI_NOT_CONFIGURED",
  "AI_RATE_LIMITED",
  "AI_INVALID_IMAGE",
  "AI_IMAGE_TOO_LARGE",
  "AI_UNSUPPORTED_IMAGE",
  "AI_TIMEOUT",
  "AI_PROVIDER_UNAVAILABLE",
  "AI_INVALID_PROVIDER_RESPONSE",
];

const isAiErrorCode = (value: unknown): value is AiErrorCode =>
  typeof value === "string" && AI_ERROR_CODES.includes(value as AiErrorCode);

export class AiServiceError extends Error {
  readonly code: AiErrorCode | "AI_REQUEST_FAILED";
  readonly retryable: boolean;
  readonly requestId?: string;

  constructor(
    message: string,
    options: {
      code: AiErrorCode | "AI_REQUEST_FAILED";
      retryable: boolean;
      requestId?: string;
    }
  ) {
    super(message);
    this.name = "AiServiceError";
    this.code = options.code;
    this.retryable = options.retryable;
    this.requestId = options.requestId;
  }
}

const parseAiError = (payload: unknown, fallbackRequestId?: string): AiServiceError => {
  const body = (payload || {}) as Partial<AiErrorResponse>;
  if (isAiErrorCode(body.code) && typeof body.message === "string") {
    return new AiServiceError(body.message, {
      code: body.code,
      retryable: body.retryable === true,
      requestId: typeof body.requestId === "string" ? body.requestId : fallbackRequestId,
    });
  }

  return new AiServiceError("AI request failed. Please try again.", {
    code: "AI_REQUEST_FAILED",
    retryable: true,
    requestId: fallbackRequestId,
  });
};

const getAuthToken = async () =>
  String((await AsyncStorage.getItem("token")) || "")
    .replace(/^(\s*Bearer\s+)+/i, "")
    .trim();

/**
 * JSON-only transport foundation for later typed AI endpoints. It does not
 * select images or send multipart data; image upload remains Phase B work.
 */
export const aiJsonRequest = async <T>(endpoint: string, body: unknown): Promise<T> => {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) {
    throw parseAiError(payload, response.headers.get("x-request-id") || undefined);
  }

  return payload as T;
};

export type AiUploadImage = {
  uri: string;
  name: string;
  type: "image/jpeg";
};

const isAbortError = (error: unknown) =>
  error instanceof Error && error.name === "AbortError";

/**
 * Uploads a single normalized image to the backend. Do not set Content-Type:
 * React Native supplies the multipart boundary for FormData.
 */
export const analyzeGarments = async (
  image: AiUploadImage,
  signal?: AbortSignal
): Promise<GarmentRecognitionResult> => {
  try {
    const token = await getAuthToken();
    const formData = new FormData();
    formData.append("image", image as unknown as Blob);

    const response = await fetch(`${API_BASE_URL}/ai/garments/analyze`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
      signal,
    });
    const payload = (await response.json().catch(() => ({}))) as unknown;

    if (!response.ok) {
      throw parseAiError(payload, response.headers.get("x-request-id") || undefined);
    }

    return payload as GarmentRecognitionResult;
  } catch (error) {
    if (error instanceof AiServiceError || isAbortError(error)) {
      throw error;
    }

    throw new AiServiceError("Network error. Please check your connection and try again.", {
      code: "AI_REQUEST_FAILED",
      retryable: true,
    });
  }
};
