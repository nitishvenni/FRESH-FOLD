import { motion } from "framer-motion";
import { CheckCircle2, CircleDollarSign, Clock3, ShoppingBag } from "lucide-react";
import CountUp from "react-countup";
import { glassCard } from "../admin/styles";
import Skeleton from "./Skeleton";

type DashboardStats = {
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  deliveredOrders: number;
};

export default function DashboardCards({
  stats,
  loading = false,
}: {
  stats: DashboardStats;
  loading?: boolean;
}) {
  const cards = [
    {
      title: "Total Orders",
      value: stats.totalOrders,
      detail: "Orders tracked across the full pipeline",
      accent: "#60a5fa",
      Icon: ShoppingBag,
      prefix: "",
    },
    {
      title: "Revenue",
      value: stats.totalRevenue,
      detail: "Collected from completed verified orders",
      accent: "#f59e0b",
      Icon: CircleDollarSign,
      prefix: "Rs. ",
    },
    {
      title: "Active Orders",
      value: stats.activeOrders,
      detail: "Jobs currently moving through operations",
      accent: "#22c55e",
      Icon: Clock3,
      prefix: "",
    },
    {
      title: "Delivered Orders",
      value: stats.deliveredOrders,
      detail: "Orders completed and handed off successfully",
      accent: "#f472b6",
      Icon: CheckCircle2,
      prefix: "",
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} height={160} radius={20} />
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
      }}
    >
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          style={{
            ...glassCard,
            padding: 22,
            position: "relative",
            overflow: "hidden",
            background: `radial-gradient(circle at top right, ${card.accent}24, transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04))`,
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.22, ease: "easeOut" }}
          whileHover={{
            y: -4,
            boxShadow: `0 18px 40px ${card.accent}18, 0 18px 40px rgba(0,0,0,0.24)`,
            borderColor: `${card.accent}44`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-secondary)",
                  fontSize: 13,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {card.title}
              </p>
              <p style={{ margin: "14px 0 8px", fontSize: 34, fontWeight: 800, lineHeight: 1 }}>
                <CountUp end={card.value} duration={1.1} separator="," prefix={card.prefix} />
              </p>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>{card.detail}</p>
            </div>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                background: `${card.accent}26`,
                color: card.accent,
                border: `1px solid ${card.accent}38`,
                flexShrink: 0,
              }}
            >
              <card.Icon size={22} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
