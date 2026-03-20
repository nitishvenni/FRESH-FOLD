type ToastType = "success" | "error" | "info";

export type ToastPayload = {
  id?: string;
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number;
};

type ToastListener = (toast: Required<ToastPayload>) => void;

const listeners = new Set<ToastListener>();

export function subscribeToToast(listener: ToastListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function showToast(payload: ToastPayload) {
  const nextToast: Required<ToastPayload> = {
    id: payload.id || `${Date.now()}-${Math.random()}`,
    type: payload.type || "info",
    title: payload.title,
    message: payload.message || "",
    duration: payload.duration ?? 2800,
  };

  listeners.forEach((listener) => listener(nextToast));
}
