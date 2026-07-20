import { describe, expect, it } from "vitest";
import { isCurrentVoiceRecognitionSession, nextVoiceRecognitionSession } from "./voiceRecognitionSession";

describe("voice recognition session lifecycle", () => {
  it("keeps a pending permission request current until it is explicitly replaced", () => {
    const pending = nextVoiceRecognitionSession(0);
    expect(isCurrentVoiceRecognitionSession(pending, pending, true)).toBe(true);
  });
  it("prevents a stale permission completion after cancel, retry, or unmount", () => {
    const pending = nextVoiceRecognitionSession(0);
    const replacement = nextVoiceRecognitionSession(pending);
    expect(isCurrentVoiceRecognitionSession(replacement, pending, true)).toBe(false);
    expect(isCurrentVoiceRecognitionSession(pending, pending, false)).toBe(false);
  });
});
