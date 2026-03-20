import type { CSSProperties } from "react";
import type { SupportTicket } from "./types";

export const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  color: "#fff",
  background:
    "radial-gradient(1200px circle at 15% 10%, rgba(245,158,11,0.16), transparent 28%), radial-gradient(1000px circle at 80% 0%, rgba(59,130,246,0.12), transparent 32%), #080808",
};

export const shellContentStyle: CSSProperties = {
  flex: 1,
  padding: 32,
};

export const glassCard: CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(16px)",
  borderRadius: 22,
  padding: 20,
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 22px 60px rgba(0,0,0,0.28)",
};

export const sectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 18,
  fontSize: 28,
};

export const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

export const inputStyle: CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.1)",
  backgroundColor: "rgba(5,8,14,0.9)",
  color: "#fff",
};

export const selectStyle: CSSProperties = {
  width: "100%",
  minWidth: 170,
  padding: 10,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.1)",
  backgroundColor: "rgba(5,8,14,0.9)",
  color: "#fff",
};

export const buttonStyle: CSSProperties = {
  background: "linear-gradient(135deg, #f2a949, #ffce74)",
  color: "#111",
  padding: "10px 18px",
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
  boxShadow: "0 10px 28px rgba(242,169,73,0.28)",
};

export const smallButtonStyle: CSSProperties = {
  ...buttonStyle,
  padding: "8px 14px",
};

export const miniCardStyle: CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16,
  padding: 14,
};

export const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
  borderRadius: 18,
};

export const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

export const thStyle: CSSProperties = {
  textAlign: "left",
  padding: 12,
  borderBottom: "1px solid #262626",
  color: "#e5e7eb",
  fontSize: 13,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

export const tdStyle: CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #161616",
  verticalAlign: "top",
};

export const statusBadgeBase: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

export const mutedTextStyle: CSSProperties = {
  color: "var(--text-muted)",
};

export function getOrderStatusStyle(status: string): CSSProperties {
  switch (status) {
    case "Scheduled":
      return { backgroundColor: "#374151", color: "#fff" };
    case "Received at Facility":
      return { backgroundColor: "#1d4ed8", color: "#fff" };
    case "Picked Up":
      return { backgroundColor: "#0ea5e9", color: "#04111d" };
    case "Washing":
      return { backgroundColor: "#2563eb", color: "#fff" };
    case "Ironing":
      return { backgroundColor: "#7c3aed", color: "#fff" };
    case "Out for Delivery":
      return { backgroundColor: "#f97316", color: "#111" };
    case "Delivered":
      return { backgroundColor: "#16a34a", color: "#fff" };
    default:
      return { backgroundColor: "#222", color: "#fff" };
  }
}

export function getTicketStatusStyle(status: SupportTicket["status"]): CSSProperties {
  switch (status) {
    case "Open":
      return { backgroundColor: "#ef4444", color: "#fff" };
    case "In Progress":
      return { backgroundColor: "#f59e0b", color: "#111827" };
    case "Resolved":
      return { backgroundColor: "#16a34a", color: "#fff" };
    default:
      return { backgroundColor: "#222", color: "#fff" };
  }
}
