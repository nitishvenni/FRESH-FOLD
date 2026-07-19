import { describe, expect, it } from "vitest";
import {
  MAX_VOICE_BOOKING_TRANSCRIPT_LENGTH,
  canStartVoiceRecognition,
  canSubmitVoiceTranscript,
  shouldCancelVoiceRecognitionForAppState,
} from "./voiceBookingState";

describe("Voice Booking state rules", () => {
  it("prevents duplicate microphone starts while recognition or booking parsing is active", () => {
    expect(canStartVoiceRecognition("idle", false)).toBe(true);
    expect(canStartVoiceRecognition("listening", false)).toBe(false);
    expect(canStartVoiceRecognition("stopping", false)).toBe(false);
    expect(canStartVoiceRecognition("idle", true)).toBe(false);
  });

  it("allows only a reviewed, bounded transcript to enter the existing Phase G submission", () => {
    expect(canSubmitVoiceTranscript("Dry clean two jackets on express", "transcript_ready", false)).toBe(true);
    expect(canSubmitVoiceTranscript("   ", "transcript_ready", false)).toBe(false);
    expect(canSubmitVoiceTranscript("x".repeat(MAX_VOICE_BOOKING_TRANSCRIPT_LENGTH + 1), "transcript_ready", false)).toBe(false);
    expect(canSubmitVoiceTranscript("Wash two shirts", "listening", false)).toBe(false);
  });

  it("cancels active recognition when the app leaves the foreground", () => {
    expect(shouldCancelVoiceRecognitionForAppState("listening", "background")).toBe(true);
    expect(shouldCancelVoiceRecognitionForAppState("requesting_permission", "inactive")).toBe(true);
    expect(shouldCancelVoiceRecognitionForAppState("transcript_ready", "background")).toBe(false);
    expect(shouldCancelVoiceRecognitionForAppState("listening", "active")).toBe(false);
  });
});
