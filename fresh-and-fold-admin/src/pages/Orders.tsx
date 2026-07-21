import { useMemo, useState } from "react";
import { glassCard, inputStyle, selectStyle, mutedTextStyle, buttonStyle } from "../admin/styles";
import { useAdminData } from "../admin/AdminContext";
import OrderDrawer from "../components/OrderDrawer";
import OrderTable from "../components/OrderTable";
import { getOrderServiceLabel, type Order } from "../admin/types";
import { X, Search } from "lucide-react";

export default function OrdersPage() {
  const { orders, loadingOrders, updateOrderStatus, simulateOrder, statusUpdateError, clearStatusUpdateError } = useAdminData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [serviceFilter, setServiceFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const availableServices = useMemo(() => Array.from(new Set(orders.map(getOrderServiceLabel).filter(Boolean))), [orders]);
  const availablePaymentStatuses = useMemo(() => Array.from(new Set(orders.map((o) => o.paymentStatus).filter(Boolean))), [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const normalizedSearch = search.trim().toLowerCase();
      const matchesQuery =
        !normalizedSearch ||
        order._id.toLowerCase().includes(normalizedSearch) ||
        getOrderServiceLabel(order).toLowerCase().includes(normalizedSearch) ||
        String(order.mobile || "").includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Pending" &&
          (order.status === "Scheduled" || order.status === "Received at Facility")) ||
        (statusFilter === "Picked" &&
          ["Picked Up", "Washing", "Ironing", "Out for Delivery"].includes(order.status)) ||
        (statusFilter === "Delivered" && order.status === "Delivered");

      const matchesService = serviceFilter === "All" || getOrderServiceLabel(order) === serviceFilter;
      const matchesPayment = paymentFilter === "All" || order.paymentStatus === paymentFilter;

      return matchesQuery && matchesStatus && matchesService && matchesPayment;
    });
  }, [orders, search, statusFilter, serviceFilter, paymentFilter]);

  const summary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let active = 0;
    let delivered = 0;
    let todayCount = 0;

    for (const o of orders) {
      if (o.status === "Delivered") delivered++;
      else if (o.status !== "Cancelled") active++;

      if (o.createdAt) {
        const orderDate = new Date(o.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        if (orderDate.getTime() === today.getTime()) {
          todayCount++;
        }
      }
    }

    return { total: orders.length, active, delivered, todayCount };
  }, [orders]);

  const hasActiveFilters = search !== "" || statusFilter !== "All" || serviceFilter !== "All" || paymentFilter !== "All";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setServiceFilter("All");
    setPaymentFilter("All");
  };

  return (
    <div style={{ display: "grid", gap: 24, paddingBottom: 64 }}>
      {/* Page Header */}
      <div>
        <p style={{ margin: 0, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12, fontWeight: 700 }}>
          Operations
        </p>
        <h1 style={{ margin: "8px 0 6px", fontSize: 32, fontWeight: 800 }}>Orders</h1>
        <p style={{ margin: 0, color: "var(--text-muted)" }}>Monitor the active pipeline and move laundry jobs through each stage.</p>
      </div>

      {/* Operations Summary */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[
          { label: "Total Orders", value: summary.total },
          { label: "Active", value: summary.active, accent: "#2563EB" },
          { label: "Delivered", value: summary.delivered, accent: "#16A34A" },
          { label: "Today / New", value: summary.todayCount },
        ].map((stat) => (
          <div key={stat.label} style={{ ...glassCard, padding: "12px 18px", display: "flex", alignItems: "baseline", gap: 12, flex: "1 1 180px", borderLeft: stat.accent ? `3px solid ${stat.accent}` : undefined }}>
            <p style={{ ...mutedTextStyle, margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>{stat.label}</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div
        style={{
          ...glassCard,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          padding: 16,
          alignItems: "center"
        }}
      >
        <div style={{ flex: "1 1 240px", position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: 14, top: 11, color: "rgba(255,255,255,0.4)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by phone, order ID, or service..."
            style={{ ...inputStyle, paddingLeft: 42, margin: 0 }}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...selectStyle, width: "auto", flex: "1 1 140px" }}>
          <option value="All">All Statuses</option>
          <option value="Pending">Pending (Scheduled, Received)</option>
          <option value="Picked">Picked (In Progress)</option>
          <option value="Delivered">Delivered</option>
        </select>
        <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} style={{ ...selectStyle, width: "auto", flex: "1 1 140px" }}>
          <option value="All">All Services</option>
          {availableServices.map((srv) => (
            <option key={srv} value={srv}>{srv}</option>
          ))}
        </select>
        <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} style={{ ...selectStyle, width: "auto", flex: "1 1 140px", textTransform: "capitalize" }}>
          <option value="All">All Payments</option>
          {availablePaymentStatuses.map((ps) => (
            <option key={ps} value={ps}>{ps}</option>
          ))}
        </select>
        
        {hasActiveFilters && (
          <button onClick={clearFilters} style={{ ...buttonStyle, background: "rgba(255,255,255,0.08)", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", whiteSpace: "nowrap" }}>
            <X size={16} /> Clear
          </button>
        )}
      </div>

      {statusUpdateError && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderRadius: 12,
          background: "rgba(220, 38, 38, 0.15)",
          border: "1px solid rgba(220, 38, 38, 0.3)",
          color: "#fca5a5"
        }}>
          <span>{statusUpdateError}</span>
          <button
            onClick={clearStatusUpdateError}
            style={{
              background: "transparent",
              border: "none",
              color: "#fca5a5",
              cursor: "pointer",
              padding: 4,
              display: "flex"
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

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
