import { glassCard, mutedTextStyle } from "../admin/styles";
import { useAdminData } from "../admin/AdminContext";
import DashboardCards from "../components/DashboardCards";
import { useNavigate } from "react-router-dom";
import LiveActivityFeed from "../components/LiveActivityFeed";
import RevenueChart from "../components/RevenueChart";
import Skeleton from "../components/Skeleton";

export default function DashboardPage() {
  const {
    totalRevenue,
    totalOrders,
    activeOrders,
    deliveredOrders,
    openTickets,
    newTicketAlerts,
    overdueTicketsCount,
    analytics,
    chartData,
    activityFeed,
    loadingOrders,
    loadingAnalytics,
  } = useAdminData();
  const navigate = useNavigate();

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 24,
        }}
      >
        <div style={{ display: "grid", gap: 18 }}>
          <div
            style={{
              ...glassCard,
              padding: 24,
              display: "grid",
              gap: 14,
              background:
                "radial-gradient(circle at top right, rgba(37,99,235,0.16), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
            }}
          >
            <div>
              <p style={{ margin: 0, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 12 }}>
                Daily pulse
              </p>
              <h2 style={{ margin: "10px 0 8px", fontSize: 30 }}>Run the operation from one board</h2>
              <p style={{ margin: 0, color: "var(--text-muted)", maxWidth: 600 }}>
                Revenue, orders, delivery throughput, and escalations are all visible here so the team can react faster.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ padding: "10px 14px", borderRadius: 999, background: "rgba(37,99,235,0.15)", color: "#bfdbfe", fontWeight: 600 }}>
                {activeOrders} active orders
              </div>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  background: newTicketAlerts > 0 ? "rgba(220,38,38,0.15)" : "rgba(255,255,255,0.05)",
                  color: newTicketAlerts > 0 ? "#fecaca" : "var(--text-secondary)",
                  fontWeight: 600,
                }}
              >
                {newTicketAlerts} new alerts
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            <DashboardCards
              loading={loadingOrders}
              stats={{
                totalOrders,
                totalRevenue,
                activeOrders,
                deliveredOrders,
              }}
            />
            {!loadingOrders ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                }}
              >
                <div 
                  onClick={() => navigate("/support")}
                  style={{ ...glassCard, padding: 18, cursor: "pointer" }}
                >
                  <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Open Tickets
                  </p>
                  <p style={{ margin: "12px 0 6px", fontSize: 30, fontWeight: 800 }}>{openTickets}</p>
                  <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>
                    Customer issues that still need admin action
                  </p>
                </div>
                <div 
                  onClick={() => navigate("/support")}
                  style={{ ...glassCard, padding: 18, cursor: "pointer" }}
                >
                  <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    New Alerts
                  </p>
                  <p style={{ margin: "12px 0 6px", fontSize: 30, fontWeight: 800 }}>{newTicketAlerts}</p>
                  <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>
                    Fresh support changes detected by the live feed
                  </p>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                }}
              >
                {Array.from({ length: 2 }, (_, index) => (
                  <Skeleton key={index} height={134} radius={18} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ ...glassCard, display: "grid", gap: 14, alignContent: "start" }}>
          <h3 style={{ margin: 0 }}>Operations Snapshot</h3>
          {loadingAnalytics ? (
            <div style={{ display: "grid", gap: 12 }}>
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} height={92} radius={16} />
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <p style={{ ...mutedTextStyle, margin: 0, fontWeight: 600 }}>AI Resolution Rate</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, minWidth: 64 }}>{analytics?.aiResolvedRate ?? 0}%</span>
                  <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, Math.max(0, analytics?.aiResolvedRate ?? 0))}%`, height: "100%", background: "#2563EB", borderRadius: 999 }} />
                  </div>
                </div>
              </div>
              
              <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <p style={{ ...mutedTextStyle, margin: 0, fontWeight: 600 }}>Escalation Rate</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, minWidth: 64 }}>{analytics?.escalationRate ?? 0}%</span>
                  <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, Math.max(0, analytics?.escalationRate ?? 0))}%`, height: "100%", background: "#F59E0B", borderRadius: 999 }} />
                  </div>
                </div>
              </div>
              
              <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <p style={{ ...mutedTextStyle, margin: 0, fontWeight: 600 }}>Avg Response</p>
                <p style={{ fontSize: 28, fontWeight: 800, margin: "8px 0 0" }}>
                  {analytics?.avgResponseTimeMinutes ?? "-"} <span style={{ fontSize: 16, color: "var(--text-muted)", fontWeight: 600 }}>min</span>
                </p>
              </div>
              
              <div style={{ 
                padding: 16, 
                borderRadius: 16, 
                background: overdueTicketsCount > 0 ? "rgba(220,38,38,0.12)" : "rgba(255,255,255,0.02)",
                border: overdueTicketsCount > 0 ? "1px solid rgba(220,38,38,0.2)" : "1px solid rgba(255,255,255,0.04)",
              }}>
                <p style={{ ...mutedTextStyle, margin: 0, fontWeight: 600, color: overdueTicketsCount > 0 ? "#fca5a5" : "var(--text-muted)" }}>Overdue Tickets</p>
                <p style={{ fontSize: 28, fontWeight: 800, margin: "8px 0 0", color: overdueTicketsCount > 0 ? "#ef4444" : "inherit" }}>
                  {overdueTicketsCount}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <RevenueChart chartData={chartData} title="Revenue Momentum" />

      <LiveActivityFeed items={activityFeed} />

      <div style={{ ...glassCard, display: "grid", gap: 12 }}>
        <h3 style={{ marginTop: 0, marginBottom: 0 }}>Priority Alerts</h3>
        {analytics?.overdueTickets.length ? (
          analytics.overdueTickets.slice(0, 5).map((ticket) => (
            <div
              key={ticket.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: 14,
                borderRadius: 12,
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>Ticket #{ticket.id.slice(-6)}</div>
                <div style={mutedTextStyle}>{ticket.reason}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div>{ticket.status}</div>
                <div style={mutedTextStyle}>{ticket.overdueType || "overdue"}</div>
              </div>
            </div>
          ))
        ) : (
          <p style={{ ...mutedTextStyle, margin: 0 }}>No overdue issues right now.</p>
        )}
      </div>
    </div>
  );
}
