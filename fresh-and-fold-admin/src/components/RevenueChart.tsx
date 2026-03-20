import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { glassCard } from "../admin/styles";

export default function RevenueChart({
  chartData,
  title = "Revenue Overview",
}: {
  chartData: Array<{ date: string; revenue: number }>;
  title?: string;
}) {
  return (
    <motion.div style={{ ...glassCard, willChange: "transform" }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: "easeOut" }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f2a949" stopOpacity={0.42} />
              <stop offset="95%" stopColor="#f2a949" stopOpacity={0.02} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" />
          <XAxis dataKey="date" stroke="#9ca3af" tickLine={false} axisLine={false} />
          <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: "rgba(10, 15, 25, 0.96)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              color: "#fff",
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            filter="url(#glow)"
            stroke="#facc15"
            strokeWidth={2.5}
            fill="url(#revenueFill)"
            isAnimationActive
            animationDuration={500}
            dot={false}
            activeDot={{ r: 5, stroke: "#fff7d6", fill: "#facc15" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
