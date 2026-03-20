import { motion } from "framer-motion";
import { TICKET_STATUSES } from "../admin/constants";
import Skeleton from "./Skeleton";
import {
  getTicketStatusStyle,
  selectStyle,
  statusBadgeBase,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../admin/styles";
import type { SupportTicket } from "../admin/types";

export default function TicketTable({
  tickets,
  loading,
  selectedTicketId,
  onSelectTicket,
  onUpdateTicketStatus,
}: {
  tickets: SupportTicket[];
  loading: boolean;
  selectedTicketId: string | null;
  onSelectTicket: (id: string) => void;
  onUpdateTicketStatus: (id: string, status: SupportTicket["status"]) => Promise<void>;
}) {
  if (loading) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} height={58} radius={14} />
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return <p>No support tickets.</p>;
  }

  return (
    <div style={tableWrapStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Ticket ID</th>
            <th style={thStyle}>User Mobile</th>
            <th style={thStyle}>Order</th>
            <th style={thStyle}>Outcome</th>
            <th style={thStyle}>Reason</th>
            <th style={thStyle}>User Message</th>
            <th style={thStyle}>Created</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>SLA</th>
            <th style={thStyle}>Change Status</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <motion.tr
              key={ticket.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => onSelectTicket(ticket.id)}
              style={{
                backgroundColor:
                  selectedTicketId === ticket.id ? "rgba(245,158,11,0.12)" : "transparent",
                cursor: "pointer",
              }}
            >
              <td style={tdStyle}>{ticket.id.slice(-6)}</td>
              <td style={tdStyle}>{ticket.mobile}</td>
              <td style={tdStyle}>{ticket.orderId ? String(ticket.orderId).slice(-6) : "-"}</td>
              <td style={tdStyle}>{ticket.aiOutcome === "escalated" ? "Escalated" : "AI Handled"}</td>
              <td style={tdStyle}>{ticket.reason}</td>
              <td style={tdStyle}>{ticket.userMessage || ticket.message}</td>
              <td style={tdStyle}>{new Date(ticket.createdAt).toLocaleString()}</td>
              <td style={tdStyle}>
                <span style={{ ...statusBadgeBase, ...getTicketStatusStyle(ticket.status) }}>
                  {ticket.status}
                </span>
              </td>
              <td style={tdStyle}>
                {ticket.sla?.overdue ? (
                  <span style={{ ...statusBadgeBase, backgroundColor: "#dc2626", color: "#fff" }}>
                    Overdue ({ticket.sla.overdueType})
                  </span>
                ) : (
                  "On Track"
                )}
              </td>
              <td
                style={tdStyle}
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                <select
                  value={ticket.status}
                  onChange={(e) => {
                    void onUpdateTicketStatus(ticket.id, e.target.value as SupportTicket["status"]);
                  }}
                  style={selectStyle}
                >
                  {TICKET_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
