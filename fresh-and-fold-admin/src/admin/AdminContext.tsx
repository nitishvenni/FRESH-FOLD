import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE_URL } from "./constants";
import type { ActivityFeedItem, AdminNotification, Order, SupportAnalytics, SupportTicket } from "./types";

type AdminContextValue = {
  orders: Order[];
  tickets: SupportTicket[];
  analytics: SupportAnalytics | null;
  loadingOrders: boolean;
  loadingTickets: boolean;
  loadingAnalytics: boolean;
  newTicketAlerts: number;
  notifications: AdminNotification[];
  unreadNotificationCount: number;
  activityFeed: ActivityFeedItem[];
  soundEnabled: boolean;
  error: string | null;
  adminToken: string | null;
  normalizedToken: string;
  selectedTicketId: string | null;
  selectedTicket: SupportTicket | null;
  ticketReply: string;
  sendingTicketReply: boolean;
  totalRevenue: number;
  totalOrders: number;
  deliveredOrders: number;
  activeOrders: number;
  openTickets: number;
  overdueTicketsCount: number;
  chartData: Array<{ date: string; revenue: number }>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateOrderStatus: (id: string, status: string) => Promise<void>;
  simulateOrder: (id: string) => Promise<void>;
  updateTicketStatus: (id: string, status: SupportTicket["status"]) => Promise<void>;
  sendAdminMessage: () => Promise<void>;
  setSelectedTicketId: (id: string | null) => void;
  setTicketReply: (value: string) => void;
  setSoundEnabled: (value: boolean | ((value: boolean) => boolean)) => void;
  clearTicketAlerts: () => void;
  clearNotifications: () => void;
  markNotificationsRead: () => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [analytics, setAnalytics] = useState<SupportAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [newTicketAlerts, setNewTicketAlerts] = useState(0);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketReply, setTicketReply] = useState("");
  const [sendingTicketReply, setSendingTicketReply] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(localStorage.getItem("adminToken"));
  const orderCountRef = useRef<number | null>(null);
  const staleOrderCountRef = useRef<number | null>(null);

  const normalizedToken = useMemo(
    () =>
      String(adminToken || "")
        .replace(/^(\s*Bearer\s+)+/i, "")
        .trim(),
    [adminToken]
  );

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );

  const totalRevenue = useMemo(
    () => orders.reduce((sum, order) => sum + order.totalAmount, 0),
    [orders]
  );
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter((order) => order.status === "Delivered").length;
  const activeOrders = orders.filter((order) => order.status !== "Delivered").length;
  const openTickets = tickets.filter((ticket) => ticket.status !== "Resolved").length;
  const overdueTicketsCount = analytics?.overdueTickets.length || 0;

  const chartData = useMemo(() => {
    const revenueByDate: Record<string, number> = {};
    orders.forEach((order) => {
      const date = new Date(order.createdAt).toLocaleDateString();
      revenueByDate[date] = (revenueByDate[date] || 0) + order.totalAmount;
    });
    return Object.entries(revenueByDate).map(([date, revenue]) => ({ date, revenue }));
  }, [orders]);

  const pushNotification = useCallback((notification: Omit<AdminNotification, "id" | "createdAt">) => {
    const entry: AdminNotification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...notification,
    };
    setNotifications((current) => [entry, ...current].slice(0, 12));
    setUnreadNotificationCount((count) => count + 1);
  }, []);

  const pushActivity = useCallback((entry: Omit<ActivityFeedItem, "id" | "createdAt">) => {
    const nextEntry: ActivityFeedItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...entry,
    };
    setActivityFeed((current) => [nextEntry, ...current].slice(0, 10));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("adminToken");
    setAdminToken(null);
    setOrders([]);
    setTickets([]);
    setAnalytics(null);
    setNewTicketAlerts(0);
    setNotifications([]);
    setUnreadNotificationCount(0);
    setActivityFeed([]);
    setSelectedTicketId(null);
    setTicketReply("");
    setError(null);
    orderCountRef.current = null;
    staleOrderCountRef.current = null;
  }, []);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${normalizedToken}`,
      "Content-Type": "application/json",
    }),
    [normalizedToken]
  );

  const fetchOrders = useCallback(async () => {
    if (!normalizedToken) return;
    setLoadingOrders(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/orders`, {
        headers: { Authorization: `Bearer ${normalizedToken}` },
      });
      const data = await response.json();
      if (response.status === 401 || response.status === 403) {
        logout();
        return;
      }
      if (!response.ok || !data.success) {
        setError(data.message || "Failed to load orders");
        return;
      }
      const nextOrders = data.orders || [];
      setOrders(nextOrders);

      const staleOrders = nextOrders.filter((order: Order) => {
        const ageHours = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);
        return order.status !== "Delivered" && ageHours >= 24;
      }).length;

      if (orderCountRef.current !== null && nextOrders.length > orderCountRef.current) {
        const delta = nextOrders.length - orderCountRef.current;
        pushNotification({
          type: "order",
          title: delta === 1 ? "New order received" : `${delta} new orders received`,
          message: `Operations queue now holds ${nextOrders.length} orders.`,
        });
        pushActivity({
          type: "order",
          title: delta === 1 ? "New order added" : `${delta} orders added`,
          meta: `${nextOrders.length} total orders in pipeline`,
        });
      }

      if (staleOrderCountRef.current !== null && staleOrders > staleOrderCountRef.current) {
        pushNotification({
          type: "delay",
          title: "Delayed orders detected",
          message: `${staleOrders} active orders are older than 24 hours.`,
        });
        pushActivity({
          type: "delay",
          title: "Delay risk increased",
          meta: `${staleOrders} active orders need attention`,
        });
      }

      orderCountRef.current = nextOrders.length;
      staleOrderCountRef.current = staleOrders;
    } catch {
      setError("Server not reachable");
    } finally {
      setLoadingOrders(false);
    }
  }, [normalizedToken, logout]);

  const fetchTickets = useCallback(async () => {
    if (!normalizedToken) return;
    setLoadingTickets(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/tickets`, {
        headers: { Authorization: `Bearer ${normalizedToken}` },
      });
      const data = await response.json();
      if (response.status === 401 || response.status === 403) {
        logout();
        return;
      }
      if (!response.ok || !data.success) {
        setError(data.message || "Failed to load tickets");
        return;
      }
      const nextTickets = data.tickets || [];
      setTickets(nextTickets);
      setSelectedTicketId((current) => {
        if (current && nextTickets.some((ticket: SupportTicket) => ticket.id === current)) {
          return current;
        }
        return nextTickets[0]?.id || null;
      });
    } catch {
      setError("Server not reachable");
    } finally {
      setLoadingTickets(false);
    }
  }, [normalizedToken, logout]);

  const fetchSupportAnalytics = useCallback(async () => {
    if (!normalizedToken) return;
    setLoadingAnalytics(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/support/analytics`, {
        headers: { Authorization: `Bearer ${normalizedToken}` },
      });
      const data = await response.json();
      if (response.status === 401 || response.status === 403) {
        logout();
        return;
      }
      if (!response.ok || !data.success) {
        setError(data.message || "Failed to load support analytics");
        return;
      }
      setAnalytics(data.analytics || null);
    } catch {
      setError("Server not reachable");
    } finally {
      setLoadingAnalytics(false);
    }
  }, [normalizedToken, logout]);

  const playNotificationTone = useCallback(() => {
    if (!soundEnabled) return;
    const AudioContextCtor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    const audioContext = new AudioContextCtor();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 920;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    gain.gain.value = 0.08;
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.12);
  }, [soundEnabled]);

  useEffect(() => {
    if (!normalizedToken) return;

    void fetchOrders();
    void fetchTickets();
    void fetchSupportAnalytics();

    const socket = io(API_BASE_URL);
    if (selectedTicketId) {
      socket.emit("joinTicket", selectedTicketId);
    }
    socket.on("ordersUpdated", fetchOrders);
    socket.on("orderUpdated", (order: Order) => {
      pushNotification({
        type: "order",
        title: `Order ${order._id.slice(-6)} updated`,
        message: `Status moved to ${order.status}.`,
      });
      pushActivity({
        type: "order",
        title: `Order ${order._id.slice(-6)}`,
        meta: `${order.service || "Laundry"} is now ${order.status}`,
      });
      void fetchOrders();
    });
    socket.on("ticketsUpdated", fetchTickets);
    socket.on("ticketCreated", (payload?: { ticket?: SupportTicket; createdAt?: string }) => {
      setNewTicketAlerts((value) => value + 1);
      const ticket = payload?.ticket;
      if (ticket) {
        pushNotification({
          type: "ticket",
          title: `New support ticket ${ticket.id.slice(-6)}`,
          message: ticket.reason || "Customer issue requires review.",
        });
        pushActivity({
          type: "ticket",
          title: `Ticket ${ticket.id.slice(-6)} created`,
          meta: ticket.reason || "Support escalation received",
        });
      }
      void fetchTickets();
      void fetchSupportAnalytics();
      playNotificationTone();
    });
    socket.on("newTicket", () => {
      void fetchTickets();
      playNotificationTone();
    });
    socket.on("ticketMessage", (payload: { ticketId?: string }) => {
      if (payload?.ticketId) {
        void fetchTickets();
      }
    });
    socket.on("ticketUpdated", () => {
      void fetchTickets();
      void fetchSupportAnalytics();
    });
    socket.on("ticketOverdueAlert", (payload?: { overdueCount?: number }) => {
      pushNotification({
        type: "delay",
        title: "SLA breach warning",
        message: `${payload?.overdueCount ?? 0} support items are overdue.`,
      });
      pushActivity({
        type: "delay",
        title: "Overdue support alert",
        meta: `${payload?.overdueCount ?? 0} tickets crossed SLA`,
      });
      void fetchSupportAnalytics();
      playNotificationTone();
    });
    return () => {
      socket.disconnect();
    };
  }, [normalizedToken, selectedTicketId, fetchOrders, fetchTickets, fetchSupportAnalytics, playNotificationTone]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.token) {
        setError(data.message || "Invalid credentials");
        return false;
      }
      const cleanToken = String(data.token).replace(/^(\s*Bearer\s+)+/i, "").trim();
      localStorage.setItem("adminToken", cleanToken);
      setAdminToken(cleanToken);
      return true;
    } catch {
      setError("Login failed");
      return false;
    }
  }, []);

  const updateOrderStatus = useCallback(async (id: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/orders/${id}/status`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ status }),
      });
      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }
      await fetchOrders();
    } catch {
      setError("Status update failed");
    }
  }, [authHeaders, fetchOrders, logout]);

  const simulateOrder = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/orders/${id}/simulate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${normalizedToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }
      if (!res.ok || !data.success) {
        setError(data.message || "Simulation failed");
        return;
      }
      pushNotification({
        type: "order",
        title: `Simulation started for ${id.slice(-6)}`,
        message: data.nextStep
          ? `Order moved to ${data.nextStep}. Remaining steps will continue automatically.`
          : "Order simulation was accepted by the backend.",
      });
      pushActivity({
        type: "order",
        title: `Simulation queued`,
        meta: data.nextStep
          ? `Order ${id.slice(-6)} advanced to ${data.nextStep}`
          : `Order ${id.slice(-6)} will move through the workflow`,
      });
      await fetchOrders();
    } catch {
      setError("Simulation failed");
    }
  }, [normalizedToken, fetchOrders, logout, pushActivity, pushNotification]);

  const updateTicketStatus = useCallback(async (id: string, status: SupportTicket["status"]) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tickets/${id}/status`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ status }),
      });
      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }
      await fetchTickets();
      await fetchSupportAnalytics();
    } catch {
      setError("Ticket status update failed");
    }
  }, [authHeaders, fetchSupportAnalytics, fetchTickets, logout]);

  const sendAdminMessage = useCallback(async () => {
    if (!selectedTicketId || !ticketReply.trim() || sendingTicketReply) {
      return;
    }
    setSendingTicketReply(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tickets/message`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          ticketId: selectedTicketId,
          message: ticketReply.trim(),
        }),
      });
      const data = await res.json();
      if (res.status === 401 || res.status === 403) {
        logout();
        return;
      }
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to send ticket reply");
        return;
      }
      setTicketReply("");
      await fetchTickets();
      await fetchSupportAnalytics();
    } catch {
      setError("Failed to send ticket reply");
    } finally {
      setSendingTicketReply(false);
    }
  }, [authHeaders, fetchSupportAnalytics, fetchTickets, logout, selectedTicketId, sendingTicketReply, ticketReply]);

  const value = useMemo<AdminContextValue>(() => ({
    orders,
    tickets,
    analytics,
    loadingOrders,
    loadingTickets,
    loadingAnalytics,
    newTicketAlerts,
    notifications,
    unreadNotificationCount,
    activityFeed,
    soundEnabled,
    error,
    adminToken,
    normalizedToken,
    selectedTicketId,
    selectedTicket,
    ticketReply,
    sendingTicketReply,
    totalRevenue,
    totalOrders,
    deliveredOrders,
    activeOrders,
    openTickets,
    overdueTicketsCount,
    chartData,
    login,
    logout,
    updateOrderStatus,
    simulateOrder,
    updateTicketStatus,
    sendAdminMessage,
    setSelectedTicketId,
    setTicketReply,
    setSoundEnabled,
    clearTicketAlerts: () => setNewTicketAlerts(0),
    clearNotifications: () => {
      setNotifications([]);
      setUnreadNotificationCount(0);
    },
    markNotificationsRead: () => setUnreadNotificationCount(0),
  }), [
    orders,
    tickets,
    analytics,
    loadingOrders,
    loadingTickets,
    loadingAnalytics,
    newTicketAlerts,
    notifications,
    unreadNotificationCount,
    activityFeed,
    soundEnabled,
    error,
    adminToken,
    normalizedToken,
    selectedTicketId,
    selectedTicket,
    ticketReply,
    sendingTicketReply,
    totalRevenue,
    totalOrders,
    deliveredOrders,
    activeOrders,
    openTickets,
    overdueTicketsCount,
    chartData,
    login,
    logout,
    updateOrderStatus,
    simulateOrder,
    updateTicketStatus,
    sendAdminMessage,
    pushActivity,
    pushNotification,
  ]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminData() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdminData must be used within AdminProvider");
  }
  return context;
}
