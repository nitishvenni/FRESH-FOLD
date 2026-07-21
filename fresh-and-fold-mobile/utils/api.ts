import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../constants/api";
import { ApiRequestError } from "./apiError";

export { ApiRequestError } from "./apiError";

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ApiRequestOptions = {
  method?: RequestMethod;
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
};

let unauthorizedHandler: (() => Promise<void> | void) | null = null;

export function setUnauthorizedHandler(handler: (() => Promise<void> | void) | null) {
  unauthorizedHandler = handler;
}

export async function getStoredAuthToken() {
  return String((await AsyncStorage.getItem("token")) || "")
    .replace(/^(\s*Bearer\s+)+/i, "")
    .trim();
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  try {
    const token = options.token ?? (await getStoredAuthToken());

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const code = typeof data.code === "string" ? data.code : undefined;

    if (response.status === 401) {
      await AsyncStorage.removeItem("token");
      await unauthorizedHandler?.();
      throw new ApiRequestError("SESSION_EXPIRED", { status: response.status, code });
    }

    if (!response.ok) {
      throw new ApiRequestError(
        typeof data?.message === "string" && data.message
          ? data.message
          : "Something went wrong",
        { status: response.status, code }
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }

    if (error instanceof Error && error.message !== "TypeError: Network request failed") {
      if (error.message === "SESSION_EXPIRED") {
        throw error;
      }

      // Preserve explicit backend/application errors from the response body.
      if (error.message !== "Failed to fetch") {
        throw error;
      }
    }

    throw new ApiRequestError("NETWORK_ERROR", { code: "NETWORK_ERROR" });
  }
}
