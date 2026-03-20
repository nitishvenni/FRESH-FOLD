import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import { glassCard, mutedTextStyle } from "../admin/styles";

type HeatmapValue = {
  date: string;
  count: number;
  revenue: number;
};

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default function RevenueHeatmap({ values }: { values: HeatmapValue[] }) {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), 0, 1);
  const maxRevenue = values.reduce((max, item) => Math.max(max, item.revenue), 0);

  return (
    <div style={{ ...glassCard, display: "grid", gap: 14 }}>
      <div>
        <h3 style={{ margin: 0 }}>Revenue Heatmap</h3>
        <p style={{ ...mutedTextStyle, margin: "6px 0 0" }}>Daily order intensity across {now.getFullYear()}.</p>
      </div>

      <div
        className="revenue-heatmap-wrap"
        style={{
          overflowX: "auto",
          paddingBottom: 6,
        }}
      >
        <div className="revenue-heatmap">
        <CalendarHeatmap
          startDate={startDate}
          endDate={now}
          values={values}
          classForValue={(value) => {
            if (!value || value.revenue <= 0) {
              return "color-empty";
            }
            const intensity = maxRevenue ? value.revenue / maxRevenue : 0;
            if (intensity >= 0.85) return "color-gold-4";
            if (intensity >= 0.6) return "color-gold-3";
            if (intensity >= 0.35) return "color-gold-2";
            return "color-gold-1";
          }}
          tooltipDataAttrs={(value) => ({
            "data-tip": value?.date ? `${value.date}: Rs.${value.revenue} from ${value.count} orders` : "No revenue",
          })}
          showWeekdayLabels
        />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", color: "var(--text-muted)", fontSize: 13 }}>
        <span>Low</span>
        <span className="heatmap-legend heatmap-legend-1" />
        <span className="heatmap-legend heatmap-legend-2" />
        <span className="heatmap-legend heatmap-legend-3" />
        <span className="heatmap-legend heatmap-legend-4" />
        <span>High</span>
      </div>
    </div>
  );
}
