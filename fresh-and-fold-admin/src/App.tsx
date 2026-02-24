import { useEffect, useState, useCallback } from "react";
import {  useMotionValue, useSpring } from "framer-motion";
import { motion } from "framer-motion";

import { io } from "socket.io-client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Order {
  _id: string;
  service: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

const ORDER_STEPS = [
  "Scheduled",
  "Received at Facility",
  "Picked Up",
  "Washing",
  "Ironing",
  "Out for Delivery",
  "Delivered",
];

function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  // ---------- Analytics ----------

const totalRevenue = orders.reduce(
  (sum, order) => sum + order.totalAmount,
  0
);

const totalOrders = orders.length;

const deliveredOrders = orders.filter(
  (order) => order.status === "Delivered"
).length;

const activeOrders = orders.filter(
  (order) => order.status !== "Delivered"
).length;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminToken, setAdminToken] = useState(
    localStorage.getItem("adminToken")
  );

  const revenueByDate: Record<string, number> = {};

orders.forEach((order) => {
  const date = new Date(order.createdAt).toLocaleDateString();

  if (!revenueByDate[date]) {
    revenueByDate[date] = 0;
  }

  revenueByDate[date] += order.totalAmount;
});

const chartData = Object.keys(revenueByDate).map((date) => ({
  date,
  revenue: revenueByDate[date],
}));

  // ---------------- LOGIN ----------------

  const handleLogin = async () => {
    const res = await fetch("http://localhost:4000/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.success) {
      localStorage.setItem("adminToken", data.token);
      setAdminToken(data.token);
    } else {
      alert("Invalid credentials");
    }
  };

  // ---------------- FETCH ORDERS ----------------
const fetchOrders = useCallback(async () => {
  if (!adminToken) return;

  try {
    const response = await fetch(
      "http://localhost:4000/admin/orders",
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      setOrders(data.orders);
    }
  } catch (error) {
    console.error("Fetch failed");
  }
}, [adminToken]);



useEffect(() => {
  if (!adminToken) return;

  // connect socket
  const socket = io("http://localhost:4000");

  // initial load
  fetchOrders();

  // listen for real-time updates
  socket.on("ordersUpdated", () => {
    console.log("🔥 Orders updated in real-time");
    fetchOrders();
  });

  return () => {
    socket.disconnect();
  };
}, [adminToken, fetchOrders]);



  // ---------------- UPDATE STATUS ----------------

const updateStatus = async (id: string, status: string) => {
  await fetch(
    `http://localhost:4000/admin/orders/${id}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status }),
    }
  );
};

const simulateOrder = async (id: string) => {
  await fetch(
    `http://localhost:4000/admin/orders/${id}/simulate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    }
  );
};

  // ---------------- LOGOUT ----------------

  const logout = () => {
    localStorage.removeItem("adminToken");
    setAdminToken(null);
  };

  // ---------------- IF NOT LOGGED IN ----------------

  if (!adminToken) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Admin Login</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <br /><br />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br /><br />

        <button onClick={handleLogin}>Login</button>
      </div>
    );
  }

const pageStyle = {
  background: "linear-gradient(135deg, #0f0f0f, #1a1a1a)",
  minHeight: "100vh",
  color: "white",
  padding: 40,
  fontFamily: "Inter, sans-serif",
};
const glassCard = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(12px)",
  borderRadius: 16,
  padding: 20,
  border: "1px solid rgba(255,255,255,0.08)",
};

  const inputStyle = {
  width: "100%",
  padding: 10,
  marginBottom: 15,
  borderRadius: 8,
  border: "1px solid #333",
  backgroundColor: "#000",
  color: "#fff",
};

const buttonStyle = {
  backgroundColor: "#fff",
  color: "#000",
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
};

const smallButtonStyle = {
  backgroundColor: "#fff",
  color: "#000",
  padding: "6px 12px",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
};

const thStyle = {
  textAlign: "left" as const,
  padding: 10,
  borderBottom: "1px solid #222",
};

const tdStyle = {
  padding: 10,
  borderBottom: "1px solid #111",
};


const cardNumberStyle = {
  fontSize: 28,
  fontWeight: 600,
  marginTop: 10,
};
const getStatusStyle = (status: string) => {
  switch (status) {
    case "Scheduled":
      return { backgroundColor: "#333", color: "#fff" };

    case "Received at Facility":
      return { backgroundColor: "#1e3a8a", color: "#fff" };

    case "Picked Up":
      return { backgroundColor: "#0ea5e9", color: "#000" };

    case "Washing":
      return { backgroundColor: "#2563eb", color: "#fff" };

    case "Ironing":
      return { backgroundColor: "#7c3aed", color: "#fff" };

    case "Out for Delivery":
      return { backgroundColor: "#f97316", color: "#000" };

    case "Delivered":
      return { backgroundColor: "#16a34a", color: "#fff" };

    default:
      return { backgroundColor: "#222", color: "#fff" };
  }
};
const sidebarItem = {
  padding: "10px 0",
  cursor: "pointer",
  color: "#ccc",
};

// Cursor glow
const cursorX = useMotionValue(-100);
const cursorY = useMotionValue(-100);
const springX = useSpring(cursorX, { stiffness: 100, damping: 20 });
const springY = useSpring(cursorY, { stiffness: 100, damping: 20 });

const moveCursor = (e: React.MouseEvent<HTMLDivElement>) => {
  cursorX.set(e.clientX - 120);
  cursorY.set(e.clientY - 120);
};
function AnimatedNumber({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 800;
    const stepTime = 20;
    const increment = value / (duration / stepTime);

    const interval = setInterval(() => {
      start += increment;
      if (start >= value) {
        start = value;
        clearInterval(interval);
      }
      setCount(Math.floor(start));
    }, stepTime);

    return () => clearInterval(interval);
  }, [value]);

  return <span>₹{count.toLocaleString()}</span>;
}


  // ---------------- DASHBOARD ----------------

 return (
<div
  onMouseMove={moveCursor}
  style={{
    display: "flex",
    ...pageStyle,
    position: "relative",
    overflow: "hidden",
  }}
>
{/* Animated Gradient Overlay */}
<div
  style={{
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(90deg, transparent, rgba(251,191,36,0.08), transparent)",
    animation: "pulse 6s infinite",
    pointerEvents: "none",
  }}
/>

{/* Floating Gold Blob */}
<motion.div
  animate={{ y: [0, -40, 0] }}
  transition={{ repeat: Infinity, duration: 8 }}
  style={{
    position: "absolute",
    top: 100,
    left: 100,
    width: 300,
    height: 300,
    background: "rgba(251,191,36,0.08)",
    borderRadius: "50%",
    filter: "blur(80px)",
  }}
/>


    {!adminToken ? (
      <div style={{ margin: "100px auto" }}>
        <h2>Admin Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        <button onClick={handleLogin} style={buttonStyle}>
          Login
        </button>
      </div>
    ) : (
      <>
        {/* Sidebar */}
       <motion.div
  initial={{ x: -200 }}
  animate={{ x: 0 }}
  transition={{ type: "spring", stiffness: 80 }}
  style={{
    width: 220,
    background: "rgba(255,255,255,0.03)",
    backdropFilter: "blur(10px)",
    padding: 20,
    borderRight: "1px solid rgba(251,191,36,0.2)",
  }}
>

          <h2 style={{ marginBottom: 40 }}>Fresh & Fold</h2>

          <div style={sidebarItem}>Dashboard</div>
          <div style={sidebarItem}>Orders</div>
          <div style={sidebarItem}>Analytics</div>

          <div style={{ marginTop: 60 }}>
            <button onClick={logout} style={buttonStyle}>
              Logout
            </button>
          </div>
        </motion.div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: 40 }}>
          <h1 style={{ marginBottom: 30 }}>Admin Dashboard</h1>

          {/* Analytics Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 20,
              marginBottom: 40,
            }}
          >
            <motion.div
  style={glassCard}
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
  whileHover={{
    boxShadow: "0 0 40px rgba(251,191,36,0.3)",
  }}
>


              <h3>Total Revenue</h3>
              <p style={cardNumberStyle}>
                <AnimatedNumber value={totalRevenue} />

              </p>
            </motion.div>

          <motion.div
  style={glassCard}
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
  whileHover={{
    boxShadow: "0 0 40px rgba(251,191,36,0.3)",
  }}
>

              <h3>Total Orders</h3>
              <p style={cardNumberStyle}>
                <AnimatedNumber value={totalOrders} />
              </p>
            </motion.div>

            <motion.div
  style={glassCard}
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
  whileHover={{
    boxShadow: "0 0 40px rgba(251,191,36,0.3)",
  }}
>

              <h3>Active Orders</h3>
              <p style={cardNumberStyle}>
                <AnimatedNumber value={activeOrders} />
              </p>
            </motion.div>

            <motion.div
  style={glassCard}
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
  whileHover={{
    boxShadow: "0 0 40px rgba(251,191,36,0.3)",
  }}
>

              <h3>Delivered</h3>
              <p style={cardNumberStyle}>
              <AnimatedNumber value={deliveredOrders} />
              </p>
            </motion.div>
          </div>
{/* Revenue Chart */}
<div
  style={{
    ...glassCard,
    marginBottom: 40,
  }}
>

  <h3 style={{ marginBottom: 20 }}>
    Revenue Overview
  </h3>

  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={chartData}>
      <XAxis
        dataKey="date"
        stroke="#888"
      />
      <YAxis stroke="#888" />
      <Tooltip />
      <Line
        type="monotone"
        dataKey="revenue"
        stroke="#fff"
        strokeWidth={2}
      />
    </LineChart>
  </ResponsiveContainer>
</div>

          {/* Orders Table */}
          <div style={glassCard}>

            <table style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Service</th>
                  <th style={thStyle}>Total</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Update</th>
                  <th style={thStyle}>Simulate</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <motion.tr
  key={order._id}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>

                    <td style={tdStyle}>
                      {order._id.slice(-6)}
                    </td>
                    <td style={tdStyle}>
                      {order.service}
                    </td>
                    <td style={tdStyle}>
                      ₹{order.totalAmount}
                    </td>

                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: "6px 12px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 500,
                          ...getStatusStyle(order.status),
                        }}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td style={tdStyle}>
                      <select
                        value={order.status}
                        onChange={(e) =>
                          updateStatus(
                            order._id,
                            e.target.value
                          )
                        }
                        style={inputStyle}
                      >
                        {ORDER_STEPS.map((step) => (
                          <option
                            key={step}
                            value={step}
                          >
                            {step}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={tdStyle}>
                      <button
                        onClick={() =>
                          simulateOrder(order._id)
                        }
                        style={smallButtonStyle}
                      >
                        Simulate
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    )}
    {/* cursor glow */}
    <motion.div
  style={{
    position: "fixed",
    left: springX,
    top: springY,
    width: 300,
    height: 300,
    background: "rgba(251,191,36,0.15)",
    borderRadius: "50%",
    filter: "blur(80px)",
    pointerEvents: "none",
    zIndex: 999,
  }}
/>

  </div>
);

}
export default App;
