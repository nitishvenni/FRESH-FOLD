import { io } from "socket.io-client";
import { API_BASE_URL } from "../constants/api";

export const orderSocket = io(API_BASE_URL, {
  autoConnect: false,
  transports: ["websocket"],
});

export const supportSocket = io(API_BASE_URL, {
  autoConnect: false,
  transports: ["websocket"],
});
