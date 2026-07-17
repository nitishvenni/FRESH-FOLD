import type { CSSProperties } from "react";
import type { SupportTicket } from "./types";

export const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  color: "#fff",
  background: "#030712",
};

export const shellContentStyle: CSSProperties = {
  flex: 1,
  padding: 32,
};

export const glassCard: CSSProperties = {
  background: "rgba(17, 24, 39, 0.6)",
  backdropFilter: "blur(8px)",
  borderRadius: 16,
  padding: 20,
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
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
  background: "var(--accent)",
  color: "#fff",
  padding: "10px 18px",
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  boxShadow: "0 4px 14px rgba(37,99,235,0.24)",
};

export const smallButtonStyle: CSSProperties = {
  ...buttonStyle,
  padding: "8px 14px",
};

export const miniCardStyle: CSSProperties = {
  background: "rgba(30, 41, 59, 0.4)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
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
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  color: "var(--text-muted)",
  fontSize: 12,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  fontWeight: 600,
};

export const tdStyle: CSSProperties = {
  padding: 12,
  borderBottom: "1px solid rgba(255,255,255,0.04)",
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
      return { backgroundColor: "#334155", color: "#fff" };
    case "Received at Facility":
      return { backgroundColor: "#1e3a8a", color: "#fff" };
    case "Picked Up":
      return { backgroundColor: "#0284c7", color: "#fff" };
    case "Washing":
      return { backgroundColor: "#2563eb", color: "#fff" };
    case "Ironing":
      return { backgroundColor: "#7c3aed", color: "#fff" };
    case "Out for Delivery":
      return { backgroundColor: "#f59e0b", color: "#fff" };
    case "Delivered":
      return { backgroundColor: "#16a34a", color: "#fff" };
    case "Cancelled":
      return { backgroundColor: "#dc2626", color: "#fff" };
    default:
      return { backgroundColor: "#1e293b", color: "#fff" };
  }
}

export function getTicketStatusStyle(status: SupportTicket["status"]): CSSProperties {
  switch (status) {
    case "Open":
      return { backgroundColor: "#dc2626", color: "#fff" };
    case "In Progress":
      return { backgroundColor: "#d97706", color: "#fff" };
    case "Resolved":
      return { backgroundColor: "#16a34a", color: "#fff" };
    default:
      return { backgroundColor: "#1e293b", color: "#fff" };
  }
}
