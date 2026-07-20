import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import {
  ADMINS_ROOM,
  createSocketAuthenticationMiddleware,
  emitOrderStatusUpdate,
  emitTicketCreated,
  emitTicketMessage,
  emitTicketUpdated,
  getAdminRoom,
  getSocketCorsOrigins,
  getTicketRoom,
  getUserRoom,
  registerSocketAuthorization,
} from "../../src/realtime/socketSecurity";

const secret = "socket-security-test-secret";

class FakeSocket {
  data: Record<string, unknown> = {};
  handshake: { auth: Record<string, unknown> };
  joined: string[] = [];
  handlers = new Map<string, (...args: any[]) => unknown>();
  disconnected = false;

  constructor(auth: Record<string, unknown> = {}) {
    this.handshake = { auth };
  }

  join(room: string) {
    this.joined.push(room);
    return Promise.resolve();
  }

  on(event: string, handler: (...args: any[]) => unknown) {
    this.handlers.set(event, handler);
    return this;
  }

  disconnect() {
    this.disconnected = true;
    return this;
  }
}

class FakeIo {
  connectionHandler: ((socket: FakeSocket) => void) | null = null;
  emissions: Array<{ room: string; event: string; payload?: unknown }> = [];

  on(event: string, handler: (socket: FakeSocket) => void) {
    if (event === "connection") this.connectionHandler = handler;
    return this;
  }

  to(room: string) {
    return {
      emit: (event: string, payload?: unknown) => {
        this.emissions.push({ room, event, payload });
      },
    };
  }
}

const authenticate = async (socket: FakeSocket) => {
  const middleware = createSocketAuthenticationMiddleware(secret);
  return new Promise<Error | undefined>((resolve) => middleware(socket as any, resolve));
};

const connect = (io: FakeIo, socket: FakeSocket) => {
  io.connectionHandler?.(socket);
  return socket;
};

describe("Socket.IO authentication and authorization", () => {
  it("rejects missing, invalid, and expired JWTs", async () => {
    await expect(authenticate(new FakeSocket())).resolves.toMatchObject({ message: "Unauthorized" });
    await expect(authenticate(new FakeSocket({ token: "not-a-jwt" }))).resolves.toMatchObject({ message: "Unauthorized" });

    const expired = jwt.sign({ userId: "user-a" }, secret, { expiresIn: -1 });
    await expect(authenticate(new FakeSocket({ token: expired }))).resolves.toMatchObject({ message: "Unauthorized" });
  });

  it("accepts only verified user and admin claim shapes", async () => {
    const userSocket = new FakeSocket({ token: jwt.sign({ userId: "user-a" }, secret), role: "admin", userId: "user-b" });
    await expect(authenticate(userSocket)).resolves.toBeUndefined();
    expect(userSocket.data.auth).toEqual({ principalType: "user", userId: "user-a" });

    const adminSocket = new FakeSocket({ token: jwt.sign({ adminId: "admin-a", role: "admin" }, secret) });
    await expect(authenticate(adminSocket)).resolves.toBeUndefined();
    expect(adminSocket.data.auth).toEqual({ principalType: "admin", adminId: "admin-a", role: "admin" });
  });

  it("joins users and admins only to their authorized default rooms", async () => {
    const io = new FakeIo();
    registerSocketAuthorization(io as any, { findTicketById: async () => null });

    const userSocket = new FakeSocket();
    userSocket.data.auth = { principalType: "user", userId: "user-a" };
    connect(io, userSocket);
    expect(userSocket.joined).toEqual([getUserRoom("user-a")]);

    const adminSocket = new FakeSocket();
    adminSocket.data.auth = { principalType: "admin", adminId: "admin-a", role: "admin" };
    connect(io, adminSocket);
    expect(adminSocket.joined).toEqual([getAdminRoom("admin-a"), ADMINS_ROOM]);
  });

  it("prevents a user from joining another user's ticket and permits their own ticket", async () => {
    const io = new FakeIo();
    registerSocketAuthorization(io as any, {
      findTicketById: async (ticketId) => (ticketId === "507f1f77bcf86cd799439011" ? { userId: "user-a" } : null),
    });
    const socket = new FakeSocket();
    socket.data.auth = { principalType: "user", userId: "user-b" };
    connect(io, socket);
    const joinTicket = socket.handlers.get("joinTicket")!;

    let forbidden: unknown;
    await joinTicket("507f1f77bcf86cd799439011", (response: unknown) => { forbidden = response; });
    expect(forbidden).toEqual({ ok: false, error: "Forbidden" });
    expect(socket.joined).not.toContain(getTicketRoom("507f1f77bcf86cd799439011"));

    const ownerSocket = new FakeSocket();
    ownerSocket.data.auth = { principalType: "user", userId: "user-a" };
    connect(io, ownerSocket);
    let allowed: unknown;
    await ownerSocket.handlers.get("joinTicket")!("507f1f77bcf86cd799439011", (response: unknown) => { allowed = response; });
    expect(allowed).toEqual({ ok: true });
    expect(ownerSocket.joined).toContain(getTicketRoom("507f1f77bcf86cd799439011"));
  });

  it("allows a verified admin, but not a normal user, to join an authorized ticket room", async () => {
    const io = new FakeIo();
    registerSocketAuthorization(io as any, { findTicketById: async () => ({ userId: "user-a" }) });

    const adminSocket = new FakeSocket();
    adminSocket.data.auth = { principalType: "admin", adminId: "admin-a", role: "admin" };
    connect(io, adminSocket);
    let adminResult: unknown;
    await adminSocket.handlers.get("joinTicket")!("507f1f77bcf86cd799439011", (response: unknown) => { adminResult = response; });
    expect(adminResult).toEqual({ ok: true });

    const userSocket = new FakeSocket();
    userSocket.data.auth = { principalType: "user", userId: "user-a" };
    connect(io, userSocket);
    let invalidResult: unknown;
    await userSocket.handlers.get("joinTicket")!("invalid", (response: unknown) => { invalidResult = response; });
    expect(invalidResult).toEqual({ ok: false, error: "Invalid request" });
  });

  it("delivers private order and ticket events only to authorized rooms with minimized payloads", () => {
    const io = new FakeIo();
    emitOrderStatusUpdate(io as any, {
      _id: "order-a",
      userId: "user-a",
      status: "Washing",
      updatedAt: "2026-07-21T10:00:00.000Z",
    });
    emitTicketCreated(io as any, { _id: "ticket-a", status: "open", reason: "Pickup issue" });
    emitTicketMessage(io as any, "ticket-a", { sender: "admin", text: "We can help", createdAt: "2026-07-21T10:00:00.000Z" });
    emitTicketUpdated(io as any, { _id: "ticket-a", status: "in_progress" });

    expect(io.emissions).toContainEqual({
      room: getUserRoom("user-a"),
      event: "orderUpdated",
      payload: { orderId: "order-a", status: "Washing", updatedAt: "2026-07-21T10:00:00.000Z" },
    });
    expect(io.emissions.every((event) => event.room !== "*")).toBe(true);
    expect(io.emissions.find((event) => event.event === "orderUpdated" && event.room === getUserRoom("user-a"))?.payload).toEqual({
      orderId: "order-a",
      status: "Washing",
      updatedAt: "2026-07-21T10:00:00.000Z",
    });
    expect(io.emissions.find((event) => event.event === "ticketCreated")?.room).toBe(ADMINS_ROOM);
    expect(io.emissions.find((event) => event.event === "ticketUpdated")?.payload).toMatchObject({
      ticketId: "ticket-a",
      status: "In Progress",
    });
  });

  it("requires an explicit browser-origin allow-list in production", () => {
    expect(() => getSocketCorsOrigins({ NODE_ENV: "production" })).toThrow("SOCKET_CORS_ORIGINS");
    expect(getSocketCorsOrigins({ NODE_ENV: "production", SOCKET_CORS_ORIGINS: "https://admin.example.com" })).toEqual([
      "https://admin.example.com",
    ]);
  });
});
