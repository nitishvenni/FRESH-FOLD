import { apiRequest } from "../utils/api";

type RequestOptions = {
  token?: string;
  headers?: Record<string, string>;
};

const api = {
  get<T>(endpoint: string, options: RequestOptions = {}) {
    return apiRequest<T>(endpoint, {
      method: "GET",
      ...options,
    });
  },
  post<T>(endpoint: string, body?: unknown, options: RequestOptions = {}) {
    return apiRequest<T>(endpoint, {
      method: "POST",
      body,
      ...options,
    });
  },
  put<T>(endpoint: string, body?: unknown, options: RequestOptions = {}) {
    return apiRequest<T>(endpoint, {
      method: "PUT",
      body,
      ...options,
    });
  },
  patch<T>(endpoint: string, body?: unknown, options: RequestOptions = {}) {
    return apiRequest<T>(endpoint, {
      method: "PATCH",
      body,
      ...options,
    });
  },
  delete<T>(endpoint: string, options: RequestOptions = {}) {
    return apiRequest<T>(endpoint, {
      method: "DELETE",
      ...options,
    });
  },
};

export default api;
