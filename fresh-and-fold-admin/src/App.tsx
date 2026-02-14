import { useEffect, useState } from "react";

interface Order {
  _id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch("http://localhost:4000/admin/orders");
      const data = await response.json();

      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.log("Error fetching orders", error);
    }
  };

  return (
    <div style={{ padding: "60px", fontFamily: "Arial" }}>
      <h1>Fresh & Fold Admin</h1>

      {orders.length === 0 ? (
        <p>No Orders Found</p>
      ) : (
        orders.map((order) => (
          <div
  key={order._id}
  style={{
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "16px",
    marginTop: "16px",
  }}
>
  <p><strong>Order:</strong> #{order._id.slice(-6)}</p>
  <p>Total: ₹{order.totalAmount}</p>
  <p>Date: {new Date(order.createdAt).toDateString()}</p>

  <select
    value={order.status}
    onChange={async (e) => {
      const newStatus = e.target.value;

      await fetch(`http://localhost:4000/admin/orders/${order._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      fetchOrders(); // refresh list
    }}
    style={{ marginTop: "10px", padding: "6px" }}
  >
    <option>Scheduled</option>
    <option>Picked Up</option>
    
    <option>Washing</option>
    <option>Out for Delivery</option>
    <option>Delivered</option>
  </select>
</div>

        ))
      )}
    </div>
  );
}
