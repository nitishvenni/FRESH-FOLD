import { glassCard, miniCardStyle, mutedTextStyle } from "../admin/styles";
import { useAdminData } from "../admin/AdminContext";
import RevenueChart from "../components/RevenueChart";
import RevenueHeatmap from "../components/RevenueHeatmap";
import Skeleton from "../components/Skeleton";

export default function AnalyticsPage() {
  const { analytics, loadingAnalytics, chartData, orders } = useAdminData();

  const heatmapValues = Object.values(
    orders.reduce<Record<string, { date: string; count: number; revenue: number }>>((acc, order) => {
      const date = new Date(order.createdAt).toISOString().slice(0, 10);
      acc[date] ??= { date, count: 0, revenue: 0 };
      acc[date].count += 1;
      acc[date].revenue += order.totalAmount;
      return acc;
    }, {})
  );

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalOrders = orders.length;

  return (
    <div style={{ display: "grid", gap: 24, paddingBottom: 64 }}>
      {/* Page Header */}
      <div>
        <p style={{ margin: 0, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12, fontWeight: 700 }}>
          Insights
        </p>
        <h1 style={{ margin: "8px 0 6px", fontSize: 32, fontWeight: 800 }}>Analytics</h1>
        <p style={{ margin: 0, color: "var(--text-muted)" }}>Review performance trends, escalations, and operational efficiency.</p>
      </div>

      {/* Analytics Summary */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ ...glassCard, padding: "16px 20px", flex: "1 1 200px" }}>
          <p style={{ ...mutedTextStyle, margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Total Revenue</p>
          <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800 }}>₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div style={{ ...glassCard, padding: "16px 20px", flex: "1 1 200px" }}>
          <p style={{ ...mutedTextStyle, margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Total Orders</p>
          <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800 }}>{totalOrders.toLocaleString()}</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <RevenueChart chartData={chartData} />

      {/* Heatmap */}
      <RevenueHeatmap values={heatmapValues} />

      {/* Grid: AI Support & Issues */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24 }}>
        
        {/* AI Support Performance */}
        <div style={{ ...glassCard, display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{ margin: 0 }}>AI Support Performance</h3>
          {loadingAnalytics ? (
            <div style={{ display: "grid", gap: 14 }}>
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} height={60} radius={12} />
              ))}
            </div>
          ) : analytics ? (
            <div style={{ display: "grid", gap: 20 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>AI Resolution Rate</span>
                  <span style={{ fontWeight: 700 }}>{analytics.aiResolvedRate}%</span>
                </div>
                <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, analytics.aiResolvedRate))}%`, background: "#16A34A", borderRadius: 4 }} />
                </div>
                <p style={{ ...mutedTextStyle, margin: "6px 0 0", fontSize: 12 }}>Issues handled without escalation</p>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>Escalation Rate</span>
                  <span style={{ fontWeight: 700 }}>{analytics.escalationRate}%</span>
                </div>
                <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, analytics.escalationRate))}%`, background: "#F59E0B", borderRadius: 4 }} />
                </div>
                <p style={{ ...mutedTextStyle, margin: "6px 0 0", fontSize: 12 }}>Handed off to support staff</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
                <div style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 12 }}>
                  <span style={{ ...mutedTextStyle, fontSize: 12, textTransform: "uppercase", fontWeight: 600 }}>Avg Response</span>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                    {analytics.avgResponseTimeMinutes ?? "-"} <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>min</span>
                  </div>
                </div>
                <div style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 12 }}>
                  <span style={{ ...mutedTextStyle, fontSize: 12, textTransform: "uppercase", fontWeight: 600 }}>Avg Resolution</span>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                    {analytics.avgResolutionTimeMinutes ?? "-"} <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>min</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ ...mutedTextStyle, margin: 0 }}>No support data available.</p>
          )}
        </div>

        {/* Issue Insights */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={glassCard}>
          <h3 style={{ marginTop: 0 }}>Most Common Issues</h3>
          {analytics?.mostCommonIssues.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {analytics.mostCommonIssues.map((entry) => (
                <div key={entry.issue} style={miniCardStyle}>
                  <div style={{ fontWeight: 700 }}>{entry.issue}</div>
                  <div style={mutedTextStyle}>{entry.count} escalations</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ ...mutedTextStyle, margin: 0 }}>No escalations yet.</p>
          )}
        </div>

        <div style={glassCard}>
          <h3 style={{ marginTop: 0 }}>Overdue Tickets</h3>
          {analytics?.overdueTickets.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {analytics.overdueTickets.map((ticket) => (
                <div key={ticket.id} style={miniCardStyle}>
                  <div style={{ fontWeight: 700 }}>#{ticket.id.slice(-6)}</div>
                  <div style={mutedTextStyle}>{ticket.reason}</div>
                  <div style={{ marginTop: 8 }}>{ticket.status}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ ...mutedTextStyle, margin: 0 }}>No overdue tickets right now.</p>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
