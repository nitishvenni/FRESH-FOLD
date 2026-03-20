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

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "http://localhost:4000";
