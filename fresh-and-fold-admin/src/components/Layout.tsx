import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

const pageMeta: Record<string, { eyebrow: string; title: string; subtitle: string }> = {
  "/": {
    eyebrow: "Overview",
    title: "Dashboard",
    subtitle: "Track revenue, service health, and support load in one place.",
  },
  "/orders": {
    eyebrow: "Operations",
    title: "Orders",
    subtitle: "Monitor the active pipeline and move laundry jobs through each stage.",
  },
  "/analytics": {
    eyebrow: "Insights",
    title: "Analytics",
    subtitle: "Review performance trends, escalations, and operational efficiency.",
  },
  "/support": {
    eyebrow: "Customer Ops",
    title: "Support",
    subtitle: "Prioritize live tickets, alerts, and customer conversations.",
  },
};

export default function Layout({ children, error }: { children: ReactNode; error?: string | null }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const meta = useMemo(() => pageMeta[location.pathname] ?? pageMeta["/"], [location.pathname]);

  useEffect(() => {
    const handlePress = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const pressable = target?.closest("button, [role='button']") as HTMLElement | null;
      if (!pressable) return;
      pressable.classList.remove("press-feedback");
      void pressable.offsetWidth;
      pressable.classList.add("press-feedback");
      window.setTimeout(() => {
        pressable.classList.remove("press-feedback");
      }, 720);
    };

    document.addEventListener("pointerdown", handlePress);
    return () => {
      document.removeEventListener("pointerdown", handlePress);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        color: "var(--text-primary)",
        backgroundColor: "var(--background, #05070c)",
        position: "relative",
      }}
    >
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "grid",
          gridTemplateRows: "auto 1fr",
          padding: 24,
          gap: 18,
          position: "relative",
          zIndex: 1,
        }}
      >
        <TopBar eyebrow={meta.eyebrow} title={meta.title} subtitle={meta.subtitle} />

        <main
          style={{
            minWidth: 0,
            borderRadius: 24,
            padding: 24,
            background: "transparent",
            position: "relative",
            zIndex: 1,
          }}
        >
          {error ? (
            <div
              style={{
                marginBottom: 18,
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(248,113,113,0.25)",
                background: "rgba(127,29,29,0.24)",
                color: "#fecaca",
              }}
            >
              {error}
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
