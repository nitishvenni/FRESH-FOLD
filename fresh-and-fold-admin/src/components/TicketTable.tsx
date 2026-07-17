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
            <th style={thStyle}>Ticket & User</th>
            <th style={thStyle}>Issue Preview</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Action</th>
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
                  selectedTicketId === ticket.id ? "rgba(37,99,235,0.12)" : "transparent",
                cursor: "pointer",
              }}
            >
              <td style={tdStyle}>
                <div style={{ fontWeight: 600, fontFamily: "monospace", color: "var(--text-secondary)", marginBottom: 4 }}>
                  #{ticket.id.slice(-6)}
                </div>
                <div>{ticket.mobile}</div>
              </td>
              <td style={{ ...tdStyle, maxWidth: 220 }}>
                <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--text-primary)" }} title={ticket.userMessage || ticket.message}>
                  {ticket.userMessage || ticket.message}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </div>
              </td>
              <td style={tdStyle}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                  <span style={{ ...statusBadgeBase, ...getTicketStatusStyle(ticket.status) }}>
                    {ticket.status}
                  </span>
                  {ticket.sla?.overdue ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#f87171" }}>
                      OVERDUE
                    </span>
                  ) : null}
                </div>
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
                  style={{ ...selectStyle, padding: "6px 28px 6px 12px", borderRadius: 8, fontSize: 13, minWidth: "120px", width: "100%" }}
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
