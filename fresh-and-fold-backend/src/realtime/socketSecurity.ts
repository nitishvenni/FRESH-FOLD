import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import type { Server, Socket } from "socket.io";
import { isTrustedAdminClaims } from "../admin/auth";

export const ADMINS_ROOM = "admins";
export const getUserRoom = (userId: string) => `user:${userId}`;
export const getAdminRoom = (adminId: string) => `admin:${adminId}`;
export const getTicketRoom = (ticketId: string) => `ticket:${ticketId}`;

export type SocketPrincipal =
  | { principalType: "user"; userId: string }
  | { principalType: "admin"; adminId: string; role: "admin" };

type AuthenticatedSocket = Socket & { data: { auth?: SocketPrincipal } };

type TicketLookup = (ticketId: string) => Promise<{ userId: unknown } | null>;

type SocketCorsEnvironment = Partial<Pick<NodeJS.ProcessEnv, "NODE_ENV" | "SOCKET_CORS_ORIGINS">>;

const getToken = (value: unknown) =>
  typeof value === "string"
    ? value.replace(/^(\s*Bearer\s+)+/i, "").trim()
    : "";

const getPrincipal = (decoded: unknown): SocketPrincipal | null => {
  if (!decoded || typeof decoded !== "object") return null;
  const claims = decoded as Record<string, unknown>;

  if (isTrustedAdminClaims(claims)) {
    return { principalType: "admin", adminId: claims.adminId, role: "admin" };
  }

  if (
    typeof claims.userId === "string" &&
    claims.userId.length > 0 &&
    !claims.adminId &&
    !claims.role
  ) {
    return { principalType: "user", userId: claims.userId };
  }

  return null;
};

export const createSocketAuthenticationMiddleware = (jwtSecret: string) =>
  (socket: AuthenticatedSocket, next: (error?: Error) => void) => {
    const token = getToken(socket.handshake.auth?.token);
    if (!token) return next(new Error("Unauthorized"));

    try {
      const principal = getPrincipal(jwt.verify(token, jwtSecret));
      if (!principal) return next(new Error("Unauthorized"));
      socket.data.auth = principal;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  };

const acknowledge = (callback: unknown, payload: { ok: boolean; error?: string }) => {
  if (typeof callback === "function") {
    (callback as (response: { ok: boolean; error?: string }) => void)(payload);
  }
};

export const registerSocketAuthorization = (
  io: Server,
  options: { findTicketById: TicketLookup }
) => {
  io.on("connection", (socket: AuthenticatedSocket) => {
    const principal = socket.data.auth;
    if (!principal) {
      socket.disconnect(true);
      return;
    }

    if (principal.principalType === "user") {
      socket.join(getUserRoom(principal.userId));
    } else {
      socket.join(getAdminRoom(principal.adminId));
      socket.join(ADMINS_ROOM);
    }

    socket.on("joinTicket", async (rawTicketId: unknown, callback?: unknown) => {
      const ticketId = typeof rawTicketId === "string" ? rawTicketId.trim() : "";
      if (!mongoose.isValidObjectId(ticketId)) {
        acknowledge(callback, { ok: false, error: "Invalid request" });
        return;
      }

      try {
        const ticket = await options.findTicketById(ticketId);
        const currentPrincipal = socket.data.auth;
        const isOwner =
          currentPrincipal?.principalType === "user" &&
          ticket &&
          String(ticket.userId) === currentPrincipal.userId;
        const isAuthorizedAdmin = currentPrincipal?.principalType === "admin" && currentPrincipal.role === "admin";

        if (!ticket || (!isOwner && !isAuthorizedAdmin)) {
          acknowledge(callback, { ok: false, error: "Forbidden" });
          return;
        }

        await socket.join(getTicketRoom(ticketId));
        acknowledge(callback, { ok: true });
      } catch {
        acknowledge(callback, { ok: false, error: "Invalid request" });
      }
    });

    socket.on("leaveTicket", (rawTicketId: unknown, callback?: unknown) => {
      const ticketId = typeof rawTicketId === "string" ? rawTicketId.trim() : "";
      if (!mongoose.isValidObjectId(ticketId)) {
        acknowledge(callback, { ok: false, error: "Invalid request" });
        return;
      }
      socket.leave(getTicketRoom(ticketId));
      acknowledge(callback, { ok: true });
    });
  });
};

export const getSocketCorsOrigins = (environment?: SocketCorsEnvironment) => {
  const resolvedEnvironment = environment || {
    NODE_ENV: process.env.NODE_ENV,
    SOCKET_CORS_ORIGINS: process.env.SOCKET_CORS_ORIGINS,
  };
  const origins = String(resolvedEnvironment.SOCKET_CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (resolvedEnvironment.NODE_ENV === "production" && origins.length === 0) {
    throw new Error("SOCKET_CORS_ORIGINS must be configured in production");
  }

  return origins;
};

export const isSocketOriginAllowed = (origin: string | undefined, allowedOrigins: readonly string[], isProduction: boolean) => {
  // Native React Native sockets do not supply a browser Origin header. Browser
  // clients must be explicitly allow-listed in production.
  if (!origin) return true;
  if (!isProduction) return true;
  return allowedOrigins.includes(origin);
};

export const emitOrderStatusUpdate = (
  io: Server,
  order: { _id: unknown; userId: unknown; status: string; updatedAt?: unknown }
) => {
  const payload = {
    orderId: String(order._id),
    status: order.status,
    updatedAt: order.updatedAt || new Date(),
  };
  io.to(getUserRoom(String(order.userId))).emit("orderUpdated", payload);
  io.to(ADMINS_ROOM).emit("orderUpdated", payload);
  io.to(ADMINS_ROOM).emit("ordersUpdated");
};

export const emitTicketCreated = (
  io: Server,
  ticket: { _id: unknown; status: string; reason?: unknown; createdAt?: unknown }
) => {
  io.to(ADMINS_ROOM).emit("ticketCreated", {
    ticket: {
      id: String(ticket._id),
      status: ticket.status,
      reason: typeof ticket.reason === "string" ? ticket.reason : "",
      createdAt: ticket.createdAt || new Date(),
    },
    createdAt: new Date().toISOString(),
  });
  io.to(ADMINS_ROOM).emit("ticketsUpdated");
};

export const emitTicketUpdated = (
  io: Server,
  ticket: { _id: unknown; status: string; updatedAt?: unknown }
) => {
  const status =
    ticket.status === "open"
      ? "Open"
      : ticket.status === "in_progress"
        ? "In Progress"
        : ticket.status === "resolved"
          ? "Resolved"
          : ticket.status;
  io.to(getTicketRoom(String(ticket._id))).emit("ticketUpdated", {
    ticketId: String(ticket._id),
    status,
    updatedAt: ticket.updatedAt || new Date(),
  });
  io.to(ADMINS_ROOM).emit("ticketsUpdated");
};

export const emitTicketMessage = (
  io: Server,
  ticketId: string,
  message: { sender: string; text: string; createdAt: unknown }
) => {
  io.to(getTicketRoom(ticketId)).emit("ticketMessage", {
    ticketId,
    message,
  });
};
