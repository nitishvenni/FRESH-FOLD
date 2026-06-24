import type { SupportTicket } from "./types";

export const ORDER_STEPS = [
  "Scheduled",
  "Received at Facility",
  "Picked Up",
  "Washing",
  "Ironing",
  "Out for Delivery",
  "Delivered",
];

export const TICKET_STATUSES: Array<SupportTicket["status"]> = [
  "Open",
  "In Progress",
  "Resolved",
];

const productionApiBaseUrl = "https://fresh-and-fold-backend.onrender.com";
const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "")
  .trim()
  .replace(/\/$/, "");
const isHostedBrowser =
  typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1";
const isLocalApiUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredApiBaseUrl);

export const API_BASE_URL =
  isHostedBrowser && isLocalApiUrl
    ? productionApiBaseUrl
    : configuredApiBaseUrl || productionApiBaseUrl;
