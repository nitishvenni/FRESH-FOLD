import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE_URL } from "./constants";
import type { ActivityFeedItem, AdminNotification, AiOperationsAnalytics, Order, SupportAnalytics, SupportTicket } from "./types";

type AdminContextValue = {
  orders: Order[];
  tickets: SupportTicket[];
  analytics: SupportAnalytics | null;
  aiOperationsAnalytics: AiOperationsAnalytics | null;
  loadingOrders: boolean;
  loadingTickets: boolean;
  loadingAnalytics: boolean;
  loadingAiOperationsAnalytics: boolean;
  newTicketAlerts: number;
  notifications: AdminNotification[];
  unreadNotificationCount: number;
  activityFeed: ActivityFeedItem[];
  soundEnabled: boolean;
  error: string | null;
  statusUpdateError: string | null;
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
  resetAdminPassword: (email: string, newPassword: string, resetKey: string) => Promise<boolean>;
  logout: () => void;
  updateOrderStatus: (id: string, status: string) => Promise<void>;
  simulateOrder: (id: string) => Promise<void>;
  updateTicketStatus: (id: string, status: SupportTicket["status"]) => Promise<void>;
  sendAdminMessage: () => Promise<void>;
  setSelectedTicketId: (id: string | null) => void;
  setTicketReply: (value: string) => void;
  setSoundEnabled: (value: boolean | ((value: boolean) => boolean)) => void;
  clearTicketAlerts: () => void;
  clearStatusUpdateError: () => void;
  clearNotifications: () => void;
  markNotificationsRead: () => void;
};

type OrderStatusUpdate = {
  orderId?: string;
  status?: string;
  cleaningService?: Order["cleaningService"];
  speed?: Order["speed"];
  service?: Order["service"];
};

type TicketCreatedEvent = {
  ticket?: Pick<SupportTicket, "id" | "reason">;
  createdAt?: string;
};

const AdminContext = createContext<AdminContextValue | null>(null);

async function readApiResponse(response: Response): Promise<{ success?: boolean; token?: string; message?: string }> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      message: `The server returned an unexpected response (${response.status}).`,
    };
  }
}

function getRequestErrorMessage(action: string, error: unknown) {
  const detail = error instanceof Error && error.message ? ` ${error.message}` : "";
  return `${action} could not reach ${API_BASE_URL}.${detail}`;
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [analytics, setAnalytics] = useState<SupportAnalytics | null>(null);
  const [aiOperationsAnalytics, setAiOperationsAnalytics] = useState<AiOperationsAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingAiOperationsAnalytics, setLoadingAiOperationsAnalytics] = useState(false);
  const [newTicketAlerts, setNewTicketAlerts] = useState(0);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);
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
    setAiOperationsAnalytics(null);
    setNewTicketAlerts(0);
    setNotifications([]);
    setUnreadNotificationCount(0);
    setActivityFeed([]);
    setSelectedTicketId(null);
    setTicketReply("");
    setError(null);
    setStatusUpdateError(null);
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

  const fetchAiOperationsAnalytics = useCallback(async () => {
    if (!normalizedToken) return;
    setLoadingAiOperationsAnalytics(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/ai/analytics`, { headers: { Authorization: `Bearer ${normalizedToken}` } });
      const data = await response.json();
      if (response.status === 401 || response.status === 403) { logout(); return; }
      if (!response.ok || !data.success) { setError(data.message || "Failed to load AI operations analytics"); return; }
      setAiOperationsAnalytics(data.analytics || null);
    } catch { setError("Server not reachable"); }
    finally { setLoadingAiOperationsAnalytics(false); }
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

  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    if (!normalizedToken) return;

    void fetchOrders();
    void fetchTickets();
    void fetchSupportAnalytics();
    void fetchAiOperationsAnalytics();

    const socket = io(API_BASE_URL, {
      autoConnect: false,
      auth: { token: normalizedToken },
    });
    
    socketRef.current = socket;

    socket.on("ordersUpdated", fetchOrders);
    
    const handleOrderUpdated = (order: OrderStatusUpdate) => {
      if (!order?.orderId || !order.status) return;
      pushNotification({
        type: "order",
        title: `Order ${order.orderId.slice(-6)} updated`,
        message: `Status moved to ${order.status}.`,
      });
      pushActivity({
        type: "order",
        title: `Order ${order.orderId.slice(-6)}`,
        meta: `${order.cleaningService && order.speed ? `${order.cleaningService === "dry" ? "Dry Clean" : "Wash & Iron"} · ${order.speed === "express" ? "Express" : "Standard"}` : order.service || "Laundry"} is now ${order.status}`,
      });
      void fetchOrders();
    };
    
    socket.on("orderUpdated", handleOrderUpdated);
    socket.on("ticketsUpdated", fetchTickets);
    
    const handleTicketCreated = (payload?: TicketCreatedEvent) => {
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
    };
    
    socket.on("ticketCreated", handleTicketCreated);
    
    const handleTicketMessage = (payload: { ticketId?: string }) => {
      if (payload?.ticketId) {
        void fetchTickets();
      }
    };
    
    socket.on("ticketMessage", handleTicketMessage);
    
    const handleTicketUpdated = () => {
      void fetchTickets();
      void fetchSupportAnalytics();
    };
    
    socket.on("ticketUpdated", handleTicketUpdated);
    
    const handleTicketOverdueAlert = (payload?: { overdueCount?: number }) => {
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
    };
    
    socket.on("ticketOverdueAlert", handleTicketOverdueAlert);

    socket.connect();
    
    return () => {
      socket.off("ordersUpdated", fetchOrders);
      socket.off("orderUpdated", handleOrderUpdated);
      socket.off("ticketsUpdated", fetchTickets);
      socket.off("ticketCreated", handleTicketCreated);
      socket.off("ticketMessage", handleTicketMessage);
      socket.off("ticketUpdated", handleTicketUpdated);
      socket.off("ticketOverdueAlert", handleTicketOverdueAlert);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [normalizedToken, fetchOrders, fetchTickets, fetchSupportAnalytics, fetchAiOperationsAnalytics, playNotificationTone]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !selectedTicketId) return;

    const joinTicketRoom = () => {
      socket.emit("joinTicket", selectedTicketId);
    };

    if (socket.connected) {
      joinTicketRoom();
    }

    socket.on("connect", joinTicketRoom);

    return () => {
      socket.off("connect", joinTicketRoom);
    };
  }, [selectedTicketId]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await readApiResponse(res);
      if (!res.ok || !data.success || !data.token) {
        setError(data.message || "Invalid credentials");
        return false;
      }
      const cleanToken = String(data.token).replace(/^(\s*Bearer\s+)+/i, "").trim();
      localStorage.setItem("adminToken", cleanToken);
      setAdminToken(cleanToken);
      return true;
    } catch (error) {
      setError(getRequestErrorMessage("Login", error));
      return false;
    }
  }, []);

  const resetAdminPassword = useCallback(async (email: string, newPassword: string, resetKey: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword, resetKey }),
      });
      const data = await readApiResponse(res);
      if (!res.ok || !data.success) {
        setError(data.message || "Password reset failed");
        return false;
      }
      return true;
    } catch (error) {
      setError(getRequestErrorMessage("Password reset", error));
      return false;
    }
  }, []);

  const updateOrderStatus = useCallback(async (id: string, status: string) => {
    setStatusUpdateError(null);
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as Record<string, unknown>));
        if (res.status === 409) {
          setStatusUpdateError("Order status can only move to the next stage.");
        } else {
          setStatusUpdateError(
            typeof data.message === "string" && data.message
              ? data.message
              : "Order status update failed."
          );
        }
        return;
      }
      await fetchOrders();
    } catch {
      setStatusUpdateError("Unable to update order status. Please try again.");
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
    aiOperationsAnalytics,
    loadingOrders,
    loadingTickets,
    loadingAnalytics,
    loadingAiOperationsAnalytics,
    newTicketAlerts,
    notifications,
    unreadNotificationCount,
    activityFeed,
    soundEnabled,
    error,
    statusUpdateError,
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
    resetAdminPassword,
    logout,
    updateOrderStatus,
    simulateOrder,
    updateTicketStatus,
    sendAdminMessage,
    setSelectedTicketId,
    setTicketReply,
    setSoundEnabled,
    clearTicketAlerts: () => setNewTicketAlerts(0),
    clearStatusUpdateError: () => setStatusUpdateError(null),
    clearNotifications: () => {
      setNotifications([]);
      setUnreadNotificationCount(0);
    },
    markNotificationsRead: () => setUnreadNotificationCount(0),
  }), [
    orders,
    tickets,
    analytics,
    aiOperationsAnalytics,
    loadingOrders,
    loadingTickets,
    loadingAnalytics,
    loadingAiOperationsAnalytics,
    newTicketAlerts,
    notifications,
    unreadNotificationCount,
    activityFeed,
    soundEnabled,
    error,
    statusUpdateError,
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
    resetAdminPassword,
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
