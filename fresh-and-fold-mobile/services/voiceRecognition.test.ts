import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const listeners = new Map<string, (event: any) => void>();
  return {
    listeners,
    requestPermissionsAsync: vi.fn(),
    isRecognitionAvailable: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
    addListener: vi.fn((event: string, listener: (value: any) => void) => {
      listeners.set(event, listener);
      return { remove: vi.fn(() => listeners.delete(event)) };
    }),
  };
});

vi.mock("expo-speech-recognition", () => ({
  ExpoSpeechRecognitionModule: mocks,
}));

import { VOICE_BOOKING_LOCALE, voiceRecognition } from "./voiceRecognition";

describe("voiceRecognition", () => {
  beforeEach(() => {
    mocks.listeners.clear();
    mocks.requestPermissionsAsync.mockReset();
    mocks.isRecognitionAvailable.mockReset();
    mocks.start.mockReset();
    mocks.stop.mockReset();
    mocks.abort.mockReset();
    mocks.addListener.mockClear();
  });

  it("requests both native permissions without retaining audio", async () => {
    mocks.requestPermissionsAsync.mockResolvedValue({ granted: true });

    await expect(voiceRecognition.requestPermission()).resolves.toBe(true);
    expect(mocks.requestPermissionsAsync).toHaveBeenCalledOnce();
  });

  it("starts one en-IN transient recognition session", () => {
    voiceRecognition.start();

    expect(mocks.start).toHaveBeenCalledWith(expect.objectContaining({
      lang: VOICE_BOOKING_LOCALE,
      interimResults: true,
      continuous: false,
      maxAlternatives: 1,
      requiresOnDeviceRecognition: false,
    }));
  });

  it("maps native failures to safe UI categories and removes listeners on cleanup", () => {
    const onError = vi.fn();
    const cleanup = voiceRecognition.subscribe({ onStart: vi.fn(), onEnd: vi.fn(), onResult: vi.fn(), onError });

    mocks.listeners.get("error")?.({ error: "network", message: "do not expose this" });
    mocks.listeners.get("error")?.({ error: "not-allowed", message: "do not expose this" });
    mocks.listeners.get("error")?.({ error: "aborted", message: "do not expose this" });
    cleanup();

    expect(onError).toHaveBeenNthCalledWith(1, "network_failed");
    expect(onError).toHaveBeenNthCalledWith(2, "permission_denied");
    expect(onError).toHaveBeenCalledTimes(2);
    expect(mocks.listeners.size).toBe(0);
  });

  it("stops and cancels through the native module without uploading audio", () => {
    voiceRecognition.stop();
    voiceRecognition.cancel();

    expect(mocks.stop).toHaveBeenCalledOnce();
    expect(mocks.abort).toHaveBeenCalledOnce();
  });
});
