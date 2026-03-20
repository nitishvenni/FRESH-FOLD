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
  const paymentStatusStyles: Record<Order["paymentStatus"], { label: string; backgroundColor: string }> = {
    paid: { label: "Paid", backgroundColor: "#16a34a" },
    verified: { label: "Verified", backgroundColor: "#0891b2" },
    failed: { label: "Failed", backgroundColor: "#dc2626" },
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
    return <p>No orders found.</p>;
  }

  return (
    <div style={tableWrapStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>ID</th>
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
                background: selectedOrderId === order._id ? "rgba(242,169,73,0.09)" : "transparent",
              }}
            >
              <td style={tdStyle}>{order._id.slice(-6)}</td>
              <td style={tdStyle}>{order.service || "-"}</td>
              <td style={tdStyle}>Rs.{order.totalAmount}</td>
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
	                      color: "#fff",
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
                  style={selectStyle}
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
                  style={smallButtonStyle}
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
