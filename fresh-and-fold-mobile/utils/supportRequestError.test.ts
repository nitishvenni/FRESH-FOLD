import { describe, expect, it } from "vitest";
import { ApiRequestError } from "./apiError";
import { supportRequestFailureMessage } from "./supportRequestError";

describe("Support request error presentation", () => {
  it("keeps expired sessions distinct from network failures", () => {
    expect(supportRequestFailureMessage(new ApiRequestError("SESSION_EXPIRED", { status: 401 }))).toMatch(/session expired/i);
  });

  it("maps safe HTTP categories without provider or ticket content", () => {
    expect(supportRequestFailureMessage(new ApiRequestError("ignored", { status: 429 }))).toMatch(/busy/i);
    expect(supportRequestFailureMessage(new ApiRequestError("ignored", { status: 500 }))).toMatch(/temporarily unavailable/i);
    expect(supportRequestFailureMessage(new ApiRequestError("ignored", { status: 403 }))).toMatch(/could not send/i);
    expect(supportRequestFailureMessage(new Error("NETWORK_ERROR"))).toMatch(/network error/i);
  });
});
