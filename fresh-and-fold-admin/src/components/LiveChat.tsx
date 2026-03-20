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
      <div style={{ ...glassCard, minHeight: 460 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Live Conversation</h3>
          {selectedTicket ? (
            <span style={{ ...statusBadgeBase, ...getTicketStatusStyle(selectedTicket.status) }}>
              {selectedTicket.status}
            </span>
          ) : null}
        </div>
        {!selectedTicket ? (
          <p style={mutedTextStyle}>Select a ticket to open the live support chat.</p>
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
                          ? "rgba(245,158,11,0.17)"
                          : "rgba(37,99,235,0.16)",
                    border:
                      message.sender === "admin"
                        ? "1px solid rgba(245,158,11,0.32)"
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
          style={{
            width: "100%",
            minHeight: 240,
            marginTop: 12,
            padding: 14,
            borderRadius: 14,
            border: "1px solid #333",
            backgroundColor: "#090909",
            color: "#fff",
            resize: "vertical",
          }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              void onSendReply();
            }}
            style={buttonStyle}
            disabled={!selectedTicket || sendingTicketReply || !ticketReply.trim()}
          >
            {sendingTicketReply ? "Sending..." : "Send Reply"}
          </button>
          {selectedTicket ? (
            <button
              onClick={() => {
                void onResolve(selectedTicket.id, "Resolved");
              }}
              style={smallButtonStyle}
            >
              Mark Resolved
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
