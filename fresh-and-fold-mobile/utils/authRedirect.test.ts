import { describe, expect, it } from "vitest";
import { getAuthRedirectTarget } from "./authRedirect";

describe("authentication redirect decisions", () => {
  it("leaves the index route to its mounted route-level redirect", () => {
    expect(getAuthRedirectTarget("/", true)).toBeNull();
    expect(getAuthRedirectTarget("/", false)).toBeNull();
  });
  it("redirects authenticated users away from authentication routes", () => {
    expect(getAuthRedirectTarget("/login", true)).toBe("/home");
    expect(getAuthRedirectTarget("/otp", true)).toBe("/home");
  });
  it("redirects unauthenticated users away from protected routes", () => {
    expect(getAuthRedirectTarget("/home", false)).toBe("/login");
    expect(getAuthRedirectTarget("/voice-booking", false)).toBe("/login");
    expect(getAuthRedirectTarget("/login", false)).toBeNull();
  });
});
