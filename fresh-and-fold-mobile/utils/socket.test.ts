import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const sockets: Array<{ auth: unknown; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = [];
  return {
    sockets,
    getItem: vi.fn(),
    io: vi.fn(() => {
      const socket = { auth: undefined, connect: vi.fn(), disconnect: vi.fn() };
      sockets.push(socket);
      return socket;
    }),
  };
});

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: mocks.getItem },
}));

vi.mock("expo-constants", () => ({
  default: { expoConfig: { extra: { apiBaseUrl: "https://api.example.test" } } },
}));

vi.mock("socket.io-client", () => ({ io: mocks.io }));

import {
  connectAuthenticatedSocket,
  disconnectAuthenticatedSockets,
  orderSocket,
  supportSocket,
} from "./socket";

describe("authenticated socket lifecycle", () => {
  beforeEach(() => {
    mocks.getItem.mockReset();
    mocks.sockets.forEach((socket) => {
      socket.connect.mockClear();
      socket.disconnect.mockClear();
      socket.auth = undefined;
    });
  });

  it("does not connect without the existing authenticated token", async () => {
    mocks.getItem.mockResolvedValue(null);

    await expect(connectAuthenticatedSocket(orderSocket as never)).resolves.toBe(false);
    expect(mocks.sockets[0].connect).not.toHaveBeenCalled();
    expect(mocks.sockets[0].disconnect).toHaveBeenCalledOnce();
  });

  it("supplies the existing token through Socket.IO auth rather than a URL", async () => {
    mocks.getItem.mockResolvedValue("Bearer user-jwt");

    await expect(connectAuthenticatedSocket(supportSocket as never)).resolves.toBe(true);
    expect(mocks.sockets[1].auth).toEqual({ token: "user-jwt" });
    expect(mocks.sockets[1].connect).toHaveBeenCalledOnce();
  });

  it("disconnects both authenticated socket singletons on logout", () => {
    disconnectAuthenticatedSockets();

    expect(mocks.sockets[0].disconnect).toHaveBeenCalledOnce();
    expect(mocks.sockets[1].disconnect).toHaveBeenCalledOnce();
  });
});
