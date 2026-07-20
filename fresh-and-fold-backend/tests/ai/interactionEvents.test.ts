import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import AIInteraction from "../../src/models/AIInteraction";
import { registerAiInteractionEventRoutes } from "../../src/ai/interactionAnalytics";
import { createAiRateLimit, createAiRouter } from "../../src/ai/router";

process.env.JWT_SECRET = "phase-h-event-test-secret";
const auth = () => ({ Authorization: `Bearer ${jwt.sign({ userId: "phase-h-user" }, process.env.JWT_SECRET as string)}` });
const app = () => {
  const server = express();
  server.use("/ai", createAiRouter({ rateLimit: createAiRateLimit({ windowMs: 60_000, max: 50, namespaceSuffix: `phase-h-${Math.random()}` }), registerRoutes: registerAiInteractionEventRoutes }));
  return server;
};

afterEach(() => vi.restoreAllMocks());

describe("AI interaction lifecycle endpoint", () => {
  it("requires authentication", async () => {
    await request(app()).post("/ai/events").send({ requestId: "request_12345678", event: "reviewed" }).expect(401);
  });
  it("validates metadata-only event bodies", async () => {
    await request(app()).post("/ai/events").set(auth()).send({ requestId: "request_12345678", event: "reviewed", transcript: "private" }).expect(400);
  });
  it("enforces the shared JSON body limit before processing lifecycle metadata", async () => {
    const oversizedPayload = JSON.stringify({
      requestId: "request_12345678",
      event: "reviewed",
      padding: "x".repeat(101 * 1024),
    });
    const response = await request(app())
      .post("/ai/events")
      .set(auth())
      .set("Content-Type", "application/json")
      .send(oversizedPayload)
      .expect(413);
    expect(response.body).toMatchObject({ code: "AI_INVALID_REQUEST", retryable: false });
  });
  it("updates only a matching owned interaction and is safe to repeat", async () => {
    const update = vi.spyOn(AIInteraction, "updateOne").mockReturnValue({ exec: vi.fn().mockResolvedValue({ matchedCount: 1 }) } as any);
    const response = await request(app()).post("/ai/events").set(auth()).send({ requestId: "request_12345678", event: "continued_to_booking" }).expect(200);
    expect(response.body).toMatchObject({ success: true, requestId: response.headers["x-request-id"] });
    expect(update).toHaveBeenCalledWith({ requestId: "request_12345678", userId: "phase-h-user" }, { $set: { continuedToBooking: true } });
  });
  it("records a bounded cancellation for an owned interaction without accepting customer content", async () => {
    const update = vi.spyOn(AIInteraction, "updateOne").mockReturnValue({ exec: vi.fn().mockResolvedValue({ matchedCount: 1 }) } as any);
    const response = await request(app()).post("/ai/events").set(auth()).send({ requestId: "request_12345678", event: "cancelled" }).expect(200);

    expect(response.body).toMatchObject({ success: true, requestId: response.headers["x-request-id"] });
    expect(update).toHaveBeenCalledWith({ requestId: "request_12345678", userId: "phase-h-user" }, { $set: { outcome: "cancelled" } });
    expect(JSON.stringify(update.mock.calls)).not.toMatch(/transcript|requestText|image|quantity|service|speed/i);
  });
  it("rejects a request ID that is not owned by the authenticated user", async () => {
    vi.spyOn(AIInteraction, "updateOne").mockReturnValue({ exec: vi.fn().mockResolvedValue({ matchedCount: 0 }) } as any);
    vi.spyOn(AIInteraction, "exists").mockResolvedValue(null as any);
    await request(app()).post("/ai/events").set(auth()).send({ requestId: "request_12345678", event: "reviewed", correctionCount: 1 }).expect(400);
  });
});
