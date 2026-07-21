import type { SupportTicket } from "./types";

export const ORDER_STEPS = [
  "Scheduled",
  "Picked Up",
  "Received at Facility",
  "Washing",
  "Ironing",
  "Out for Delivery",
  "Delivered",
];

/**
 * Returns the valid status options for a given current status:
 * the current status itself (idempotent) plus exactly one forward step.
 * For an unrecognized/legacy status, returns only that status to prevent
 * arbitrary transitions.
 */
export const getValidNextStatuses = (currentStatus: string): string[] => {
  const index = ORDER_STEPS.indexOf(currentStatus);
  if (index < 0) return [currentStatus];
  if (index >= ORDER_STEPS.length - 1) return [currentStatus];
  return [currentStatus, ORDER_STEPS[index + 1]];
};

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
