import {
  buttonStyle,
  getTicketStatusStyle,
  glassCard,
  miniCardStyle,
  mutedTextStyle,
  smallButtonStyle,
  statusBadgeBase,
} from "../admin/styles";
import type { SupportTicket } from "../admin/types";

export default function LiveChat({
  selectedTicket,
  ticketReply,
  sendingTicketReply,
  onTicketReplyChange,
  onSendReply,
  onResolve,
}: {
  selectedTicket: SupportTicket | null;
  ticketReply: string;
  sendingTicketReply: boolean;
  onTicketReplyChange: (value: string) => void;
  onSendReply: () => Promise<void>;
  onResolve: (id: string, status: SupportTicket["status"]) => Promise<void>;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 16,
        alignItems: "start",
      }}
    >
      <div style={{ ...glassCard, minHeight: 460, display: "flex", flexDirection: "column" }}>
        {selectedTicket ? (
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ marginTop: 0, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>#{selectedTicket.id.slice(-6)}</span>
                  <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{selectedTicket.mobile}</span>
                </h3>
                <div style={{ ...mutedTextStyle, fontSize: 13, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span>{selectedTicket.reason}</span>
                  {selectedTicket.orderId && <span>Order #{String(selectedTicket.orderId).slice(-6)}</span>}
                  <span>{selectedTicket.aiOutcome === "escalated" ? "Escalated" : "AI Handled"}</span>
                  <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {selectedTicket.sla?.overdue ? (
                  <span style={{ ...statusBadgeBase, backgroundColor: "rgba(220, 38, 38, 0.15)", color: "#f87171" }}>
                    Overdue
                  </span>
                ) : null}
                <span style={{ ...statusBadgeBase, ...getTicketStatusStyle(selectedTicket.status) }}>
                  {selectedTicket.status}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Live Conversation</h3>
            <p style={mutedTextStyle}>Select a ticket to view details and chat.</p>
          </div>
        )}

        {!selectedTicket ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            No ticket selected.
          </div>
        ) : (
          <div
            style={{
              marginTop: 18,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              maxHeight: 380,
              overflowY: "auto",
            }}
          >
            {selectedTicket.messages.length === 0 ? (
              <p style={mutedTextStyle}>No messages yet.</p>
            ) : (
              selectedTicket.messages.map((message, index) => (
                <div
                  key={`${message.sender}-${message.createdAt}-${index}`}
                  style={{
                    ...miniCardStyle,
                    alignSelf: message.sender === "user" ? "flex-start" : "flex-end",
                    maxWidth: "82%",
                    background:
                      message.sender === "user"
                        ? "rgba(255,255,255,0.06)"
                        : message.sender === "admin"
                          ? "rgba(37,99,235,0.16)"
                          : "rgba(99, 102, 241, 0.12)",
                    border:
                      message.sender === "admin"
                        ? "1px solid rgba(37,99,235,0.32)"
                        : message.sender === "ai"
                          ? "1px solid rgba(99, 102, 241, 0.2)"
                          : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#d1d5db",
                      marginBottom: 6,
                      textTransform: "capitalize",
                    }}
                  >
                    {message.sender}
                  </div>
                  <div style={{ lineHeight: 1.6 }}>{message.text}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
                    {new Date(message.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div style={{ ...glassCard, minHeight: 460 }}>
        <h3 style={{ marginTop: 0, marginBottom: 6 }}>Admin Reply</h3>
        <p style={mutedTextStyle}>
          {selectedTicket
            ? `Replying to ticket #${selectedTicket.id.slice(-6)}`
            : "Pick a ticket from the table first."}
        </p>
        <textarea
          value={ticketReply}
          onChange={(e) => onTicketReplyChange(e.target.value)}
          placeholder="Type your response to the customer..."
          disabled={!selectedTicket || sendingTicketReply}
          className="admin-reply-composer"
          style={{
            width: "100%",
            minHeight: 180,
            marginTop: 12,
            padding: 14,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.1)",
            backgroundColor: "rgba(0,0,0,0.2)",
            color: "#fff",
            resize: "vertical",
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {selectedTicket && selectedTicket.status !== "Resolved" ? (
            <button
              onClick={() => {
                void onResolve(selectedTicket.id, "Resolved");
              }}
              style={{ ...smallButtonStyle, background: "rgba(255,255,255,0.06)", color: "var(--text-primary)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "none" }}
            >
              Mark Resolved
            </button>
          ) : null}
          <button
            onClick={() => {
              void onSendReply();
            }}
            style={buttonStyle}
            disabled={!selectedTicket || sendingTicketReply || !ticketReply.trim()}
          >
            {sendingTicketReply ? "Sending..." : "Send Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}
