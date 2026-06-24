import { useMemo, useState } from "react";
import { glassCard, inputStyle, selectStyle } from "../admin/styles";
import { useAdminData } from "../admin/AdminContext";
import OrderDrawer from "../components/OrderDrawer";
import OrderTable from "../components/OrderTable";
import type { Order } from "../admin/types";

export default function OrdersPage() {
  const { orders, loadingOrders, updateOrderStatus, simulateOrder } = useAdminData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const normalizedSearch = search.trim().toLowerCase();
      const matchesQuery =
        !normalizedSearch ||
        order._id.toLowerCase().includes(normalizedSearch) ||
        String(order.service || "").toLowerCase().includes(normalizedSearch) ||
        String(order.mobile || "").includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Pending" &&
          (order.status === "Scheduled" || order.status === "Received at Facility")) ||
        (statusFilter === "Picked" &&
          ["Picked Up", "Washing", "Ironing", "Out for Delivery"].includes(order.status)) ||
        (statusFilter === "Delivered" && order.status === "Delivered");

      return matchesQuery && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div
        style={{
          ...glassCard,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 14,
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by phone, order ID, or service"
          style={inputStyle}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="All">All</option>
          <option value="Pending">Pending</option>
          <option value="Picked">Picked</option>
          <option value="Delivered">Delivered</option>
        </select>
      </div>

      <div style={glassCard}>
        <OrderTable
          orders={filteredOrders}
          loading={loadingOrders}
          onUpdateStatus={updateOrderStatus}
          onSimulate={simulateOrder}
          onSelectOrder={setSelectedOrder}
          selectedOrderId={selectedOrder?._id ?? null}
        />
      </div>

      <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  );
}
