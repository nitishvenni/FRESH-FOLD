import { useState } from "react";
import { Bell, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useAdminData } from "../admin/AdminContext";

export default function TopBar({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  const { notifications, unreadNotificationCount, markNotificationsRead, clearNotifications } = useAdminData();
  const [open, setOpen] = useState(false);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      markNotificationsRead();
    }
  };

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        padding: "22px 24px",
        borderRadius: 24,
        background: "linear-gradient(180deg, rgba(10,18,31,0.92), rgba(8,12,21,0.72))",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            color: "var(--accent)",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {eyebrow}
        </p>
        <h1 style={{ margin: "8px 0 6px", fontSize: 32, lineHeight: 1.05 }}>{title}</h1>
        <p style={{ margin: 0, color: "var(--text-muted)", maxWidth: 620 }}>{subtitle}</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-secondary)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Service board
        </div>
        <div style={{ position: "relative" }}>
          <button
            onClick={toggleOpen}
            aria-label="Open notifications"
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              color: "#fff",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              boxShadow: unreadNotificationCount ? "0 0 24px rgba(250,204,21,0.18)" : "none",
            }}
          >
            <Bell size={18} />
          </button>
          {unreadNotificationCount > 0 ? (
            <span
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                minWidth: 22,
                height: 22,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                padding: "0 6px",
                background: "#ef4444",
                color: "#fff",
                fontSize: 11,
                fontWeight: 800,
                boxShadow: "0 8px 20px rgba(239,68,68,0.3)",
              }}
            >
              {unreadNotificationCount}
            </span>
          ) : null}

        </div>
      </div>
      {open ? createPortal(
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.34)",
              backdropFilter: "blur(8px)",
              zIndex: 9998,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              height: "100vh",
              width: "min(460px, calc(100vw - 24px))",
              background: "rgba(7,10,16,0.98)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "-20px 0 80px rgba(0,0,0,0.42)",
              padding: 24,
              zIndex: 9999,
              display: "grid",
              gridTemplateRows: "auto 1fr",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16 }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800 }}>Notifications</div>
                <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
                  {notifications.length ? `${notifications.length} recent alerts` : "No active alerts"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={clearNotifications}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--accent)",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Clear
                </button>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close notifications"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12, overflowY: "auto", paddingRight: 4, alignContent: "start" }}>
              {notifications.length ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    style={{
                      padding: 14,
                      borderRadius: 18,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                      <strong style={{ fontSize: 16 }}>{notification.title}</strong>
                      <span style={{ color: "var(--text-muted)", fontSize: 12, whiteSpace: "nowrap" }}>
                        {new Date(notification.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p style={{ margin: "8px 0 0", color: "var(--text-muted)", lineHeight: 1.6 }}>
                      {notification.message}
                    </p>
                  </div>
                ))
              ) : (
                <div style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.03)", color: "var(--text-muted)" }}>
                  Activity is quiet right now.
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      ) : null}
    </header>
  );
}
