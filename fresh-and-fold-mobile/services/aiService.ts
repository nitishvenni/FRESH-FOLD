import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../constants/api";
import type {
  CareLabelAnalysisResult,
  FabricIdentificationResult,
  GarmentRecognitionResult,
  NaturalLanguageBookingResult,
  StainAnalysisResult,
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
export const aiJsonRequest = async <T>(endpoint: string, body: unknown, signal?: AbortSignal): Promise<T> => {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
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

export type AiInteractionEvent = {
  requestId: string;
  event: "reviewed" | "continued_to_booking" | "cancelled";
  correctionCount?: number;
};

/** Best-effort metadata transport. Failure is intentionally invisible to customer flows. */
export const reportAiInteractionEvent = (event: AiInteractionEvent): void => {
  void aiJsonRequest<{ success: true }>("/ai/events", event).catch(() => undefined);
};

/** Sends one bounded typed request to the provider-agnostic Phase G endpoint. */
export const parseNaturalLanguageBooking = async (
  requestText: string,
  signal?: AbortSignal,
  source: "typed" | "voice" = "typed"
): Promise<NaturalLanguageBookingResult> => {
  try {
    return await aiJsonRequest<NaturalLanguageBookingResult>(
      "/ai/booking/parse",
      { requestText, source },
      signal
    );
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

/** Uploads one normalized image to the standalone Care Label Reader capability. */
export const analyzeCareLabel = async (
  image: AiUploadImage,
  signal?: AbortSignal
): Promise<CareLabelAnalysisResult> => {
  try {
    const token = await getAuthToken();
    const formData = new FormData();
    formData.append("image", image as unknown as Blob);

    const response = await fetch(`${API_BASE_URL}/ai/care-label/analyze`, {
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

    return payload as CareLabelAnalysisResult;
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

/** Uploads one existing normalized image to the standalone Stain Detection capability. */
export const analyzeStain = async (
  image: AiUploadImage,
  signal?: AbortSignal
): Promise<StainAnalysisResult> => {
  try {
    const token = await getAuthToken();
    const formData = new FormData();
    formData.append("image", image as unknown as Blob);

    const response = await fetch(`${API_BASE_URL}/ai/stain/analyze`, {
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

    return payload as StainAnalysisResult;
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
