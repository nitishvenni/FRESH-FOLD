export interface Order {
  _id: string;
  service: string;
  totalAmount: number;
  paymentId: string;
  paymentOrderId: string;
  paymentStatus: "verified";
  paidAt: string;
  status: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  mobile: string;
  orderId?: string | null;
  message: string;
  userMessage: string;
  aiReply: string | null;
  aiOutcome: "ai_handled" | "escalated";
  reason: string;
  intent: string;
  status: "Open" | "In Progress" | "Resolved";
  confidenceScore?: number | null;
  createdAt: string;
  updatedAt: string;
  sla?: {
    responseDueAt: string;
    resolutionDueAt: string;
    firstResponseAt: string | null;
    resolvedAt: string | null;
    responseTimeMinutes: number | null;
    resolutionTimeMinutes: number | null;
    overdue: boolean;
    overdueType: "response" | "resolution" | null;
  };
  statusHistory?: Array<{
    fromStatus: "Open" | "In Progress" | "Resolved" | null;
    toStatus: "Open" | "In Progress" | "Resolved";
    changedAt: string;
    changedBy: string;
  }>;
  messages: Array<{
    sender: "user" | "admin" | "ai";
    text: string;
    createdAt: string;
  }>;
}

export interface SupportAnalytics {
  totalInteractions: number;
  aiResolvedCount: number;
  escalatedCount: number;
  aiResolvedRate: number;
  escalationRate: number;
  avgResponseTimeMinutes: number | null;
  avgResolutionTimeMinutes: number | null;
  overdueTickets: Array<{
    id: string;
    reason: string;
    status: "Open" | "In Progress" | "Resolved";
    overdueType: "response" | "resolution" | null;
    createdAt: string;
  }>;
  mostCommonIssues: Array<{
    issue: string;
    count: number;
  }>;
}

export interface AdminNotification {
  id: string;
  type: "order" | "ticket" | "delay";
  title: string;
  message: string;
  createdAt: string;
}

export interface ActivityFeedItem {
  id: string;
  type: "order" | "ticket" | "delay";
  title: string;
  meta: string;
  createdAt: string;
}
