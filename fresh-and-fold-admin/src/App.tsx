import { Suspense, lazy, useState } from "react";
import type { CSSProperties } from "react";
import { AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AdminProvider, useAdminData } from "./admin/AdminContext";
import { buttonStyle, glassCard, inputStyle, pageStyle } from "./admin/styles";
import Layout from "./components/Layout";
import PageTransition from "./components/PageTransition";

const DashboardPage = lazy(() => import("./pages/Dashboard"));
const OrdersPage = lazy(() => import("./pages/Orders"));
const AnalyticsPage = lazy(() => import("./pages/Analytics"));
const SupportPage = lazy(() => import("./pages/Support"));

type SecretInputProps = {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  style?: CSSProperties;
};

function SecretInput({ placeholder, value, onChange, style }: SecretInputProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div style={{ position: "relative", ...style }}>
      <input
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, paddingRight: 46 }}
      />
      <button
        type="button"
        aria-label={visible ? `Hide ${placeholder}` : `Show ${placeholder}`}
        title={visible ? "Hide" : "Show"}
        onClick={() => setVisible((current) => !current)}
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          width: 30,
          height: 30,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          borderRadius: 8,
          background: "transparent",
          color: "#e5e7eb",
          cursor: "pointer",
        }}
      >
        <Icon size={18} strokeWidth={2} />
      </button>
    </div>
  );
}

function LoginScreen() {
  const { login, resetAdminPassword, error } = useAdminData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetKey, setResetKey] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setSubmitting(true);
    setLocalMessage(null);
    try {
      await login(email, password);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setLocalMessage(null);

    if (newPassword !== confirmPassword) {
      setLocalMessage("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const success = await resetAdminPassword(email, newPassword, resetKey);
      if (success) {
        setPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setResetKey("");
        setResetMode(false);
        setLocalMessage("Password updated. You can log in now.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: pageStyle.background }}>
      <div style={{ ...glassCard, width: 380, maxWidth: "calc(100vw - 32px)" }}>
        <p style={{ marginTop: 0, color: "#fbbf24", letterSpacing: "0.1em", textTransform: "uppercase", fontSize: 12 }}>
          Fresh & Fold
        </p>
        <h2 style={{ marginTop: 10, marginBottom: 18, fontSize: 34 }}>
          {resetMode ? "Reset Password" : "Admin Login"}
        </h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ ...inputStyle, marginBottom: 12 }}
        />
        {resetMode ? (
          <>
            <SecretInput
              placeholder="New password"
              value={newPassword}
              onChange={setNewPassword}
              style={{ marginTop: 12 }}
            />
            <SecretInput
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              style={{ marginTop: 12 }}
            />
            <SecretInput
              placeholder="Reset key"
              value={resetKey}
              onChange={setResetKey}
              style={{ marginTop: 12 }}
            />
            <button
              onClick={() => {
                void handleResetPassword();
              }}
              style={{ ...buttonStyle, width: "100%", marginTop: 16 }}
              disabled={submitting}
            >
              {submitting ? "Updating..." : "Update Password"}
            </button>
          </>
        ) : (
          <>
            <SecretInput
              placeholder="Password"
              value={password}
              onChange={setPassword}
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
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setResetMode((value) => !value);
            setLocalMessage(null);
          }}
          style={{
            width: "100%",
            marginTop: 12,
            padding: 0,
            border: "none",
            background: "transparent",
            color: "#fbbf24",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          {resetMode ? "Back to login" : "Forgot password?"}
        </button>
        {localMessage ? (
          <p style={{ color: localMessage.includes("updated") ? "#86efac" : "#fca5a5", marginTop: 12 }}>
            {localMessage}
          </p>
        ) : null}
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
