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

export const API_BASE_URL = configuredApiBaseUrl || productionApiBaseUrl;
