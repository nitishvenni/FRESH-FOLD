import { glassCard, mutedTextStyle } from "../admin/styles";
import { useAdminData } from "../admin/AdminContext";
import LiveActivityFeed from "../components/LiveActivityFeed";
import RevenueChart from "../components/RevenueChart";
import Skeleton from "../components/Skeleton";
import StatCard from "../components/StatCard";

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

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 18,
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
                "radial-gradient(circle at top right, rgba(242,169,73,0.16), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
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
              <div style={{ padding: "10px 14px", borderRadius: 999, background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}>
                {activeOrders} orders in progress
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 999, background: "rgba(242,169,73,0.1)", color: "#ffe1a8" }}>
                {newTicketAlerts} new ticket alerts
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            {loadingOrders ? (
              Array.from({ length: 6 }, (_, index) => <Skeleton key={index} height={134} radius={18} />)
            ) : (
              <>
                <StatCard title="Revenue" value={totalRevenue} prefix="Rs." detail="Collected across verified payments" />
                <StatCard title="Orders" value={totalOrders} detail="Total orders tracked in admin" />
                <StatCard title="Active Orders" value={activeOrders} detail="Laundry jobs currently moving" />
                <StatCard title="Delivered" value={deliveredOrders} detail="Completed successfully" />
                <StatCard title="Open Tickets" value={openTickets} detail="Customer issues requiring review" />
                <StatCard title="New Alerts" value={newTicketAlerts} detail="Fresh support queue changes" />
              </>
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
              <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.04)" }}>
                <p style={{ ...mutedTextStyle, margin: 0 }}>AI Resolution Rate</p>
                <p style={{ fontSize: 34, fontWeight: 800, margin: "8px 0 0" }}>{analytics?.aiResolvedRate ?? 0}%</p>
              </div>
              <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.04)" }}>
                <p style={{ ...mutedTextStyle, margin: 0 }}>Escalation Rate</p>
                <p style={{ fontSize: 34, fontWeight: 800, margin: "8px 0 0" }}>{analytics?.escalationRate ?? 0}%</p>
              </div>
              <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.04)" }}>
                <p style={{ ...mutedTextStyle, margin: 0 }}>Avg Response</p>
                <p style={{ fontSize: 34, fontWeight: 800, margin: "8px 0 0" }}>
                  {analytics?.avgResponseTimeMinutes ?? "-"} min
                </p>
              </div>
              <div style={{ padding: 14, borderRadius: 16, background: overdueTicketsCount ? "rgba(239,68,68,0.14)" : "rgba(255,255,255,0.04)" }}>
                <p style={{ ...mutedTextStyle, margin: 0 }}>Overdue Tickets</p>
                <p style={{ fontSize: 34, fontWeight: 800, margin: "8px 0 0" }}>{overdueTicketsCount}</p>
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
