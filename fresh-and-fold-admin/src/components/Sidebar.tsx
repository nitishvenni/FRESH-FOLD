import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { BarChart3, Headphones, LayoutDashboard, ShoppingCart } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAdminData } from "../admin/AdminContext";
import { buttonStyle } from "../admin/styles";

const sidebarItemBase: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderRadius: 16,
  color: "#d4d4d4",
  textDecoration: "none",
  fontWeight: 600,
  gap: 10,
  position: "relative",
};

const itemIconStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 12,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
};

export default function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { newTicketAlerts, openTickets, logout } = useAdminData();

  const items = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/orders", label: "Orders", icon: ShoppingCart },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/support", label: "Support", icon: Headphones, badge: newTicketAlerts || openTickets },
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? 96 : 288 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      style={{
        padding: 24,
        borderRight: "1px solid rgba(242,169,73,0.15)",
        background: "linear-gradient(180deg, rgba(8,12,21,0.98), rgba(6,8,12,0.94))",
        display: "flex",
        flexDirection: "column",
        gap: 28,
        position: "sticky",
        top: 0,
        minHeight: "100vh",
        boxShadow: "inset -1px 0 0 rgba(255,255,255,0.03)",
        willChange: "width",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, color: "#fbbf24", letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12 }}>
            Fresh & Fold
          </p>
          <h2 style={{ margin: "10px 0 0 0", fontSize: collapsed ? 20 : 30, lineHeight: 1.05 }}>
            {collapsed ? "F&F" : "Admin Console"}
          </h2>
        </div>
        <button
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            color: "#fff",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            style={({ isActive }) => ({
              ...sidebarItemBase,
              background: isActive ? "linear-gradient(90deg, rgba(242,169,73,0.2), rgba(242,169,73,0.08))" : "transparent",
              color: isActive ? "#fff" : "#d4d4d4",
              border: isActive ? "1px solid rgba(242,169,73,0.24)" : "1px solid transparent",
              padding: collapsed ? "12px 10px" : "12px 14px",
              transition: "background 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease",
            })}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 16,
                  pointerEvents: "none",
                }}
              />
              <span
                style={{
                  ...itemIconStyle,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <item.icon size={18} strokeWidth={2.1} />
              </span>
              {!collapsed ? <span>{item.label}</span> : null}
            </div>
            {!collapsed && item.badge ? (
              <span
                style={{
                  minWidth: 24,
                  height: 24,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 800,
                  padding: "0 6px",
                }}
              >
                {item.badge}
              </span>
            ) : null}
          </NavLink>
        ))}
      </div>

      <div
        style={{
          marginTop: "auto",
          padding: 16,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        {!collapsed ? <p style={{ marginTop: 0, marginBottom: 10, color: "#9ca3af" }}>Workspace</p> : null}
        <p style={{ marginTop: 0, marginBottom: 16, fontSize: collapsed ? 16 : 22, fontWeight: 800 }}>
          {collapsed ? "Ops" : "Operations"}
        </p>
        <button onClick={logout} style={{ ...buttonStyle, width: "100%" }}>
          {collapsed ? "Out" : "Logout"}
        </button>
      </div>
    </motion.aside>
  );
}
