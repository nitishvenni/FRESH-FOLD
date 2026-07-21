import { describe, expect, it } from "vitest";
import { shouldReturnMainTabBackToHome } from "./mainTabBack";

describe("main-tab Android Back policy", () => {
  it.each(["/order-history", "/ai-care", "/support", "/profile"])("returns %s to Home", (pathname) => {
    expect(shouldReturnMainTabBackToHome(pathname)).toBe(true);
  });

  it("leaves Home and nested routes to normal navigation", () => {
    expect(shouldReturnMainTabBackToHome("/home")).toBe(false);
    expect(shouldReturnMainTabBackToHome("/track-order")).toBe(false);
    expect(shouldReturnMainTabBackToHome("/support/ticket-1")).toBe(false);
  });
});
