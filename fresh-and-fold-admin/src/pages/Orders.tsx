import { useMemo, useState } from "react";
import { glassCard, inputStyle, selectStyle } from "../admin/styles";
import { useAdminData } from "../admin/AdminContext";
import { ORDER_STEPS } from "../admin/constants";
import OrderDrawer from "../components/OrderDrawer";
import OrderTable from "../components/OrderTable";
import type { Order } from "../admin/types";

export default function OrdersPage() {
  const { orders, loadingOrders, updateOrderStatus, simulateOrder } = useAdminData();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesQuery =
        !query ||
        order._id.toLowerCase().includes(query.toLowerCase()) ||
        String(order.service || "").toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [orders, query, statusFilter]);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ ...glassCard, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by order ID or service"
          style={inputStyle}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="all">All statuses</option>
          {ORDER_STEPS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
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
