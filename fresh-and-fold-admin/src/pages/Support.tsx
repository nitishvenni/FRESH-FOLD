import { useMemo, useState } from "react";
import { glassCard, inputStyle, selectStyle, smallButtonStyle } from "../admin/styles";
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

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={smallButtonStyle} onClick={() => setSoundEnabled((value) => !value)}>
            Sound: {soundEnabled ? "On" : "Off"}
          </button>
          <button style={smallButtonStyle} onClick={clearTicketAlerts}>
            Clear Alerts
          </button>
        </div>
      </div>

      <div style={{ ...glassCard, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by ticket, mobile, or reason"
          style={inputStyle}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
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

      <LiveChat
        selectedTicket={selectedTicket}
        ticketReply={ticketReply}
        sendingTicketReply={sendingTicketReply}
        onTicketReplyChange={setTicketReply}
        onSendReply={sendAdminMessage}
        onResolve={updateTicketStatus}
      />
    </div>
  );
}
