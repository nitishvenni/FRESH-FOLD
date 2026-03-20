import api from "./api";

export type TicketSender = "user" | "admin" | "ai";

export type TicketMessage = {
  sender: TicketSender;
  text: string;
  createdAt: string;
};

export type SupportTicket = {
  id: string;
  status: "Open" | "In Progress" | "Resolved";
  messages: TicketMessage[];
};

export type SupportQueryResponse = {
  success: boolean;
  response?: string;
  escalated?: boolean;
  reason?: string;
  ticket?: SupportTicket | null;
};

export type ActiveTicketResponse = {
  success: boolean;
  ticket: SupportTicket | null;
};

export type TicketMessageResponse = {
  success: boolean;
  ticket: SupportTicket;
  message: TicketMessage;
};

export const getActiveTicket = async (token: string) =>
  api.get<ActiveTicketResponse>("/support/tickets/active", { token });

export const sendSupportQuery = async (token: string, message: string) =>
  api.post<SupportQueryResponse>("/support/query", { message }, { token });

export const escalateSupportQuery = async (
  token: string,
  payload: {
    message: string;
    reason: string;
    intent: string;
    aiReply: string;
  }
) => api.post<SupportQueryResponse>("/support/escalate", payload, { token });

export const sendTicketReply = async (
  token: string,
  payload: { ticketId: string; message: string }
) => api.post<TicketMessageResponse>("/support/tickets/message", payload, { token });
