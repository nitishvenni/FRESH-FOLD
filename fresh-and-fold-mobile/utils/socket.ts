import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "../constants/api";
import { getStoredAuthToken } from "./api";

const socketOptions = {
  autoConnect: false,
  transports: ["websocket"],
};

export const orderSocket = io(API_BASE_URL, socketOptions);
export const supportSocket = io(API_BASE_URL, socketOptions);

export async function connectAuthenticatedSocket(socket: Socket) {
  const token = await getStoredAuthToken();
  if (!token) {
    socket.disconnect();
    return false;
  }

  socket.auth = { token };
  socket.connect();
  return true;
}

export function disconnectAuthenticatedSockets() {
  orderSocket.disconnect();
  supportSocket.disconnect();
}
