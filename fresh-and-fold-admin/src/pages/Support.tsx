import { useMemo, useState } from "react";
import { glassCard, inputStyle, selectStyle, smallButtonStyle, mutedTextStyle } from "../admin/styles";
import { useAdminData } from "../admin/AdminContext";
import TicketTable from "../components/TicketTable";
import LiveChat from "../components/LiveChat";

export default function SupportPage() {
  const {
    tickets,
    loadingTickets,
    selectedTicketId,
    selectedTicket,
    setSelectedTicketId,
    updateTicketStatus,
    ticketReply,
    setTicketReply,
    sendAdminMessage,
    sendingTicketReply,
    soundEnabled,
    setSoundEnabled,
    clearTicketAlerts,
  } = useAdminData();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesQuery =
        !query ||
        ticket.id.toLowerCase().includes(query.toLowerCase()) ||
        ticket.mobile.includes(query) ||
        String(ticket.reason || "").toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [tickets, query, statusFilter]);

  const summary = useMemo(() => {
    let open = 0;
    let inProgress = 0;
    let resolved = 0;
    let overdue = 0;

    for (const t of tickets) {
      if (t.status === "Open") open++;
      else if (t.status === "In Progress") inProgress++;
      else if (t.status === "Resolved") resolved++;

      if (t.sla?.overdue) overdue++;
    }

    return { open, inProgress, resolved, overdue };
  }, [tickets]);

  return (
    <div style={{ display: "grid", gap: 24, paddingBottom: 64 }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12, fontWeight: 700 }}>
            Customer Ops
          </p>
          <h1 style={{ margin: "8px 0 6px", fontSize: 32, fontWeight: 800 }}>Support</h1>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>Prioritize live tickets, alerts, and customer conversations.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={smallButtonStyle} onClick={() => setSoundEnabled((value) => !value)}>
            Sound: {soundEnabled ? "On" : "Off"}
          </button>
          <button style={smallButtonStyle} onClick={clearTicketAlerts}>
            Clear Alerts
          </button>
        </div>
      </div>

      {/* Operations Summary */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[
          { label: "Open", value: summary.open, accent: "#3B82F6" },
          { label: "In Progress", value: summary.inProgress, accent: "#2563EB" },
          { label: "Overdue", value: summary.overdue, accent: summary.overdue > 0 ? "#DC2626" : undefined },
          { label: "Resolved", value: summary.resolved, accent: "#16A34A" },
        ].map((stat) => (
          <div key={stat.label} style={{ ...glassCard, padding: "12px 18px", display: "flex", alignItems: "baseline", gap: 12, flex: "1 1 180px", borderLeft: stat.accent ? `3px solid ${stat.accent}` : undefined }}>
            <p style={{ ...mutedTextStyle, margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>{stat.label}</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: stat.label === "Overdue" && stat.value > 0 ? "#f87171" : "inherit" }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Workspace */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "start" }}>
        
        {/* Left Column: Queue */}
        <div style={{ flex: "1 1 400px", display: "grid", gap: 16 }}>
          <div style={{ ...glassCard, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ticket, mobile..."
              style={{ ...inputStyle, flex: "1 1 200px" }}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...selectStyle, flex: "1 1 120px" }}>
              <option value="all">All tickets</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          <div style={glassCard}>
            <TicketTable
              tickets={filteredTickets}
              loading={loadingTickets}
              selectedTicketId={selectedTicketId}
              onSelectTicket={setSelectedTicketId}
              onUpdateTicketStatus={updateTicketStatus}
            />
          </div>
        </div>

        {/* Right Column: Conversation */}
        <div style={{ flex: "1.5 1 500px" }}>
          <LiveChat
            selectedTicket={selectedTicket}
            ticketReply={ticketReply}
            sendingTicketReply={sendingTicketReply}
            onTicketReplyChange={setTicketReply}
            onSendReply={sendAdminMessage}
            onResolve={updateTicketStatus}
          />
        </div>

      </div>
    </div>
  );
}
