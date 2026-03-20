import { AnimatePresence, motion } from "framer-motion";
import { buttonStyle, mutedTextStyle, statusBadgeBase, getOrderStatusStyle } from "../admin/styles";
import type { Order } from "../admin/types";

function DrawerRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <span style={{ ...mutedTextStyle, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function OrderDrawer({
  order,
  onClose,
}: {
  order: Order | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {order ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.42)",
              zIndex: 30,
            }}
          />
          <motion.aside
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed",
              right: 0,
              top: 0,
              height: "100vh",
              width: "min(420px, 100vw)",
              padding: 28,
              background: "linear-gradient(180deg, rgba(8,12,21,0.98), rgba(5,7,12,0.98))",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "-20px 0 50px rgba(0,0,0,0.35)",
              zIndex: 31,
              display: "grid",
              alignContent: "start",
              gap: 18,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
              <div>
                <p style={{ margin: 0, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12 }}>
                  Order details
                </p>
                <h2 style={{ margin: "10px 0 6px" }}>#{order._id.slice(-6)}</h2>
                <span style={{ ...statusBadgeBase, ...getOrderStatusStyle(order.status) }}>{order.status}</span>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                x
              </button>
            </div>

            <div style={{ display: "grid", gap: 14, padding: 18, borderRadius: 18, background: "rgba(255,255,255,0.04)" }}>
              <DrawerRow label="Service" value={order.service || "Laundry"} />
              <DrawerRow label="Total" value={`Rs.${order.totalAmount}`} />
              <DrawerRow label="Payment Ref" value={order.paymentId || "-"} />
              <DrawerRow label="Payment Order" value={order.paymentOrderId || "-"} />
              <DrawerRow label="Paid At" value={order.paidAt ? new Date(order.paidAt).toLocaleString() : "-"} />
              <DrawerRow label="Created At" value={new Date(order.createdAt).toLocaleString()} />
            </div>

            <div style={{ padding: 18, borderRadius: 18, background: "rgba(242,169,73,0.08)", border: "1px solid rgba(242,169,73,0.16)" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Operational note</div>
              <div style={mutedTextStyle}>
                Use this panel to inspect the order without leaving the table. Status updates and simulations still work from the main grid.
              </div>
            </div>

            <button onClick={onClose} style={{ ...buttonStyle, width: "100%" }}>
              Close Drawer
            </button>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
