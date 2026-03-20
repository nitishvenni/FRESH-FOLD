import { glassCard, mutedTextStyle } from "../admin/styles";
import type { ActivityFeedItem } from "../admin/types";

const toneMap: Record<ActivityFeedItem["type"], string> = {
  order: "rgba(59,130,246,0.18)",
  ticket: "rgba(242,169,73,0.18)",
  delay: "rgba(239,68,68,0.18)",
};

export default function LiveActivityFeed({ items }: { items: ActivityFeedItem[] }) {
  return (
    <div style={{ ...glassCard, display: "grid", gap: 12 }}>
      <div>
        <h3 style={{ margin: 0 }}>Live Order Feed</h3>
        <p style={{ ...mutedTextStyle, margin: "6px 0 0" }}>Real-time operations and support events from Socket.IO.</p>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {items.length ? (
          items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns: "12px 1fr auto",
                gap: 12,
                alignItems: "start",
                padding: 14,
                borderRadius: 16,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span style={{ width: 12, height: 12, borderRadius: 999, marginTop: 4, background: toneMap[item.type] }} />
              <div>
                <div style={{ fontWeight: 700 }}>{item.title}</div>
                <div style={{ ...mutedTextStyle, marginTop: 4 }}>{item.meta}</div>
              </div>
              <div style={{ ...mutedTextStyle, fontSize: 12 }}>{new Date(item.createdAt).toLocaleTimeString()}</div>
            </div>
          ))
        ) : (
          <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)", color: "var(--text-muted)" }}>
            Waiting for live activity.
          </div>
        )}
      </div>
    </div>
  );
}
