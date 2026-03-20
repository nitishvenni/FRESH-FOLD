import { glassCard, miniCardStyle, mutedTextStyle } from "../admin/styles";
import { useAdminData } from "../admin/AdminContext";
import RevenueChart from "../components/RevenueChart";
import RevenueHeatmap from "../components/RevenueHeatmap";
import Skeleton from "../components/Skeleton";
import StatCard from "../components/StatCard";

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

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={glassCard}>
        <h3 style={{ marginTop: 0 }}>Support Analytics</h3>
        {loadingAnalytics ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} height={134} radius={18} />
            ))}
          </div>
        ) : null}
        {!loadingAnalytics && analytics ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <StatCard title="AI Resolved" value={analytics.aiResolvedRate} suffix="%" detail="Issues handled without escalation" />
            <StatCard title="Escalated" value={analytics.escalationRate} suffix="%" detail="Handed off to support staff" />
            <StatCard title="Avg Response" value={analytics.avgResponseTimeMinutes ?? "-"} suffix={analytics.avgResponseTimeMinutes != null ? " min" : undefined} detail="First response latency" />
            <StatCard title="Avg Resolution" value={analytics.avgResolutionTimeMinutes ?? "-"} suffix={analytics.avgResolutionTimeMinutes != null ? " min" : undefined} detail="Time to close a ticket" />
          </div>
        ) : null}
      </div>

      <RevenueChart chartData={chartData} />
      <RevenueHeatmap values={heatmapValues} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
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
  );
}
