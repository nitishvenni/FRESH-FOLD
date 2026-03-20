import { showToast } from "./toast";

export function handleError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Something went wrong";

  if (message === "SESSION_EXPIRED") {
    showToast({
      type: "error",
      title: "Session expired",
      message: "Please login again.",
    });
    return;
  }

  if (message === "NETWORK_ERROR") {
    showToast({
      type: "error",
      title: "Network error",
      message: "Please check your internet connection.",
    });
    return;
  }

  showToast({
    type: "error",
    title: "Something went wrong",
    message,
  });
}
