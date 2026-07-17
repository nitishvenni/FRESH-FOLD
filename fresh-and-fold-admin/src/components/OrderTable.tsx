import { motion } from "framer-motion";
import { ORDER_STEPS } from "../admin/constants";
import Skeleton from "./Skeleton";
import {
  getOrderStatusStyle,
  mutedTextStyle,
  selectStyle,
  smallButtonStyle,
  statusBadgeBase,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../admin/styles";
import type { Order } from "../admin/types";

export default function OrderTable({
  orders,
  loading,
  onUpdateStatus,
  onSimulate,
  onSelectOrder,
  selectedOrderId,
}: {
  orders: Order[];
  loading: boolean;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onSimulate: (id: string) => Promise<void>;
  onSelectOrder: (order: Order) => void;
  selectedOrderId: string | null;
}) {
  const paymentStatusStyles: Record<Order["paymentStatus"], { label: string; backgroundColor: string; color: string }> = {
    paid: { label: "Paid", backgroundColor: "rgba(22, 163, 74, 0.15)", color: "#4ade80" },
    verified: { label: "Verified", backgroundColor: "rgba(8, 145, 178, 0.15)", color: "#22d3ee" },
    failed: { label: "Failed", backgroundColor: "rgba(220, 38, 38, 0.15)", color: "#f87171" },
  };

  if (loading) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} height={58} radius={14} />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
        <p style={{ margin: 0, fontSize: 16 }}>No orders match your current filters.</p>
      </div>
    );
  }

  return (
    <div style={tableWrapStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>Phone</th>
            <th style={thStyle}>Service</th>
            <th style={thStyle}>Total</th>
            <th style={thStyle}>Payment Ref</th>
            <th style={thStyle}>Payment</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Update</th>
            <th style={thStyle}>Simulate</th>
          </tr>
        </thead>
	        <tbody>
	          {orders.map((order) => {
	            const paymentState =
	              paymentStatusStyles[order.paymentStatus] || paymentStatusStyles.verified;

	            return (
	              <motion.tr
	                key={order._id}
	              initial={{ opacity: 0 }}
	              animate={{ opacity: 1 }}
	              onClick={() => onSelectOrder(order)}
              style={{
                cursor: "pointer",
                background: selectedOrderId === order._id ? "rgba(37,99,235,0.12)" : "transparent",
              }}
	            >
	              <td style={{ ...tdStyle, fontFamily: "monospace", color: "var(--text-secondary)" }}>#{order._id.slice(-6)}</td>
	              <td style={tdStyle}>{order.mobile || "-"}</td>
	              <td style={tdStyle}>{order.service || "-"}</td>
	              <td style={{ ...tdStyle, fontWeight: 600 }}>₹{order.totalAmount}</td>
              <td style={tdStyle}>
	                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
	                  <span>pay_{order.paymentId ? order.paymentId.slice(-8) : "-"}</span>
	                  <span style={{ ...mutedTextStyle, fontSize: 12 }}>
	                    ord_{order.paymentOrderId ? order.paymentOrderId.slice(-8) : "-"}
	                  </span>
	                </div>
	              </td>
	              <td style={tdStyle}>
	                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
	                  <span
	                    style={{
	                      ...statusBadgeBase,
	                      backgroundColor: paymentState.backgroundColor,
	                      color: paymentState.color,
	                      width: "fit-content",
	                    }}
	                  >
	                    {paymentState.label}
	                  </span>
	                  <span style={{ ...mutedTextStyle, fontSize: 12 }}>
	                    {order.paidAt ? new Date(order.paidAt).toLocaleString() : "-"}
	                  </span>
	                </div>
	              </td>
              <td style={tdStyle}>
                <span style={{ ...statusBadgeBase, ...getOrderStatusStyle(order.status) }}>
                  {order.status}
                </span>
              </td>
              <td style={tdStyle}>
                <select
                  value={order.status}
                  onChange={(e) => {
                    void onUpdateStatus(order._id, e.target.value);
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  style={{ ...selectStyle, padding: "6px 28px 6px 12px", minWidth: 140, borderRadius: 8, fontSize: 13 }}
                >
                  {ORDER_STEPS.map((step) => (
                    <option key={step} value={step}>
                      {step}
                    </option>
                  ))}
                </select>
              </td>
              <td style={tdStyle}>
                <button
                  onClick={() => {
                    void onSimulate(order._id);
                  }}
                  onClickCapture={(event) => {
                    event.stopPropagation();
                  }}
                  style={{ ...smallButtonStyle, background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", boxShadow: "none", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  Simulate
                </button>
              </td>
	              </motion.tr>
	            );
	          })}
	        </tbody>
      </table>
    </div>
  );
}
