import { motion } from "framer-motion";
import { glassCard } from "../admin/styles";

export default function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <motion.div
      style={glassCard}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ boxShadow: "0 0 40px rgba(245,158,11,0.18)" }}
    >
      <p style={{ marginTop: 0, marginBottom: 10, color: "#d1d5db", fontWeight: 600 }}>{title}</p>
      <p style={{ margin: 0, fontSize: 38, fontWeight: 800 }}>{value}</p>
    </motion.div>
  );
}
