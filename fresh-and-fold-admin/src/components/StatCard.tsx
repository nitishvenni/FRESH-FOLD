import { motion } from "framer-motion";
import CountUp from "react-countup";
import { glassCard } from "../admin/styles";

export default function StatCard({
  title,
  value,
  detail,
  prefix,
  suffix,
  decimals,
}: {
  title: string;
  value: string | number;
  detail?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const isNumeric = typeof value === "number";

  return (
    <motion.div
      style={{
        ...glassCard,
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(12px)",
        borderRadius: 18,
        padding: 22,
        position: "relative",
        overflow: "hidden",
        willChange: "transform",
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        y: -3,
        boxShadow: "0 10px 28px rgba(251,191,36,0.12), 0 14px 30px rgba(0,0,0,0.18)",
        borderColor: "rgba(251,191,36,0.22)",
      }}
      transition={{ duration: 0.14, ease: "easeOut" }}
    >
      <div
        style={{
          position: "absolute",
          inset: "auto -40px -50px auto",
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(242,169,73,0.16), transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(255,255,255,0.08), transparent 36%)",
          pointerEvents: "none",
        }}
      />
      <p style={{ margin: 0, color: "var(--text-secondary)", fontWeight: 600, letterSpacing: "0.02em" }}>{title}</p>
      <p style={{ margin: "10px 0 6px", fontSize: 38, fontWeight: 800, lineHeight: 1 }}>
        {isNumeric ? (
          <CountUp end={value as number} duration={1.2} separator="," prefix={prefix} suffix={suffix} decimals={decimals} />
        ) : (
          value
        )}
      </p>
      {detail ? <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>{detail}</p> : null}
    </motion.div>
  );
}
