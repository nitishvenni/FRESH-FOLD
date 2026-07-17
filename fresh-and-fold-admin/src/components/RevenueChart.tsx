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
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" />
          <XAxis dataKey="date" stroke="#9ca3af" tickLine={false} axisLine={false} />
          <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
          <Tooltip
            formatter={(value) => [`₹${value}`, "Revenue"]}
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
            stroke="#2563EB"
            strokeWidth={2.5}
            fill="url(#revenueFill)"
            isAnimationActive
            animationDuration={500}
            dot={false}
            activeDot={{ r: 5, stroke: "#dbeafe", fill: "#2563EB" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
