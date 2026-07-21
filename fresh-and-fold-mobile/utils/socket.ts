import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "../constants/api";
import { getStoredAuthToken } from "./api";

const socketOptions = {
  autoConnect: false,
  transports: ["websocket"],
};

export const orderSocket = io(API_BASE_URL, socketOptions);
export const supportSocket = io(API_BASE_URL, socketOptions);

if (typeof __DEV__ !== "undefined" && __DEV__) {
  orderSocket.on("connect", () => console.log(`[OrderSocket] connected: ${orderSocket.id}`));
  orderSocket.on("disconnect", (reason) => console.log(`[OrderSocket] disconnected: ${reason}`));
  orderSocket.on("connect_error", (error) => console.log(`[OrderSocket] connect_error: ${error.message}`));
  
  supportSocket.on("connect", () => console.log(`[SupportSocket] connected: ${supportSocket.id}`));
  supportSocket.on("disconnect", (reason) => console.log(`[SupportSocket] disconnected: ${reason}`));
  supportSocket.on("connect_error", (error) => console.log(`[SupportSocket] connect_error: ${error.message}`));
}

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
