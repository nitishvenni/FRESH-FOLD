import { Suspense, lazy, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AdminProvider, useAdminData } from "./admin/AdminContext";
import { buttonStyle, glassCard, inputStyle, pageStyle } from "./admin/styles";
import Layout from "./components/Layout";
import PageTransition from "./components/PageTransition";

const DashboardPage = lazy(() => import("./pages/Dashboard"));
const OrdersPage = lazy(() => import("./pages/Orders"));
const AnalyticsPage = lazy(() => import("./pages/Analytics"));
const SupportPage = lazy(() => import("./pages/Support"));

function LoginScreen() {
  const { login, error } = useAdminData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setSubmitting(true);
    try {
      await login(email, password);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: pageStyle.background }}>
      <div style={{ ...glassCard, width: 380 }}>
        <p style={{ marginTop: 0, color: "#fbbf24", letterSpacing: "0.1em", textTransform: "uppercase", fontSize: 12 }}>
          Fresh & Fold
        </p>
        <h2 style={{ marginTop: 10, marginBottom: 18, fontSize: 34 }}>Admin Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ ...inputStyle, marginBottom: 12 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        <button
          onClick={() => {
            void handleLogin();
          }}
          style={{ ...buttonStyle, width: "100%", marginTop: 16 }}
          disabled={submitting}
        >
          {submitting ? "Signing in..." : "Login"}
        </button>
        {error ? <p style={{ color: "#fca5a5", marginTop: 12 }}>{error}</p> : null}
      </div>
    </div>
  );
}

function AdminShell() {
  const { normalizedToken, error } = useAdminData();
  const location = useLocation();

  if (!normalizedToken) {
    return <LoginScreen />;
  }

  return (
    <Layout error={error}>
      <AnimatePresence mode="wait">
        <Suspense fallback={<div style={glassCard}>Loading page...</div>}>
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <PageTransition>
                  <DashboardPage />
                </PageTransition>
              }
            />
            <Route
              path="/orders"
              element={
                <PageTransition>
                  <OrdersPage />
                </PageTransition>
              }
            />
            <Route
              path="/analytics"
              element={
                <PageTransition>
                  <AnalyticsPage />
                </PageTransition>
              }
            />
            <Route
              path="/support"
              element={
                <PageTransition>
                  <SupportPage />
                </PageTransition>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </Layout>
  );
}

export default function App() {
  return (
    <AdminProvider>
      <AdminShell />
    </AdminProvider>
  );
}
