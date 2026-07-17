import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../constants/api";
import type {
  FabricIdentificationResult,
  GarmentRecognitionResult,
} from "../types/ai";
import { AiServiceError, parseAiErrorResponse } from "./aiErrors";

export { AiServiceError } from "./aiErrors";

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
    throw parseAiErrorResponse(payload, {
      status: response.status,
      requestId: response.headers.get("x-request-id") || undefined,
    });
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
      throw parseAiErrorResponse(payload, {
        status: response.status,
        requestId: response.headers.get("x-request-id") || undefined,
      });
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

/** Uploads one existing normalized image to the standalone Fabric Identification capability. */
export const analyzeFabric = async (
  image: AiUploadImage,
  signal?: AbortSignal
): Promise<FabricIdentificationResult> => {
  try {
    const token = await getAuthToken();
    const formData = new FormData();
    formData.append("image", image as unknown as Blob);

    const response = await fetch(`${API_BASE_URL}/ai/fabric/analyze`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
      signal,
    });
    const payload = (await response.json().catch(() => ({}))) as unknown;

    if (!response.ok) {
      throw parseAiErrorResponse(payload, {
        status: response.status,
        requestId: response.headers.get("x-request-id") || undefined,
      });
    }

    return payload as FabricIdentificationResult;
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
