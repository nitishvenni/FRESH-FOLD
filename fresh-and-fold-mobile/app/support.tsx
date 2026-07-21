import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { MaterialIcons, Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { apiRequest } from "../utils/api";
import { connectAuthenticatedSocket, supportSocket } from "../utils/socket";
import { APP_TAB_BAR_HEIGHT } from "../components/AppTabBar";
import ChatBubble from "../components/ChatBubble";
import { radius, typography } from "../theme/theme";
import { handleError } from "../utils/errorHandler";
import { logSupportRequestDiagnostic, logSupportSocketDiagnostic, supportRequestFailureMessage } from "../utils/supportRequestError";
import { showToast } from "../utils/toast";
import { useAppTheme } from "../hooks/useAppTheme";
import useOrders from "../hooks/useOrders";
import {
  mergeConversationMessages,
  parseDismissedTicketState,
  type DismissedSupportTicketState,
} from "../utils/supportChatState";

type ChatRole = "user" | "assistant" | "admin";
type TicketSender = "user" | "admin" | "ai";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  time: string;
  createdAt?: string;
};

type TicketMessage = {
  sender: TicketSender;
  text: string;
  createdAt: string;
};

type SupportTicket = {
  id: string;
  status: "Open" | "In Progress" | "Resolved";
  messages: TicketMessage[];
};

type TicketUpdate = {
  ticketId?: string;
  status?: SupportTicket["status"];
};

type SupportQueryResponse = {
  success: boolean;
  response?: string;
  escalated?: boolean;
  reason?: string;
  ticket?: SupportTicket | null;
};

type ActiveTicketResponse = {
  success: boolean;
  ticket: SupportTicket | null;
};

type TicketMessageResponse = {
  success: boolean;
  ticket: SupportTicket;
  message: TicketMessage;
};

type AssistantQueryResult =
  | { stale: true }
  | {
      escalated: true;
      handledInTicket: boolean;
    }
  | {
      escalated: false;
      response: string;
    };

type StoredSupportState = {
  ticketId: string | null;
  messages: ChatMessage[];
  pendingNewConversation?: boolean;
};

type TicketSyncOptions = {
  generation?: number;
  expectedTicketId?: string | null;
  bindNewConversation?: boolean;
};

const starterMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Welcome to Fresh & Fold Support! 👋\nHow can we help you today?",
  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

const INPUT_BAR_BASE_HEIGHT = 160;
const SUPPORT_CHAT_STORAGE_KEY = "support_chat";
const DISMISSED_SUPPORT_TICKET_KEY = "dismissed_support_ticket";

const toTimeLabel = (value?: string) =>
  new Date(value || Date.now()).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const mapTicketMessageToChat = (message: TicketMessage, index: number): ChatMessage => ({
  id: `${message.sender}-${message.createdAt}-${index}`,
  role: message.sender === "ai" ? "assistant" : message.sender,
  text: message.text,
  time: toTimeLabel(message.createdAt),
  createdAt: message.createdAt,
});

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  
  const [messages, setMessages] = useState<ChatMessage[]>([starterMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = useState<SupportTicket["status"] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [storageHydrated, setStorageHydrated] = useState(false);
  const [pendingNewConversation, setPendingNewConversation] = useState(false);
  
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const dismissedTicketRef = useRef<DismissedSupportTicketState | null>(null);
  const ticketIdRef = useRef<string | null>(null);
  const pendingNewConversationRef = useRef(false);
  const conversationGenerationRef = useRef(0);
  const storageHydratedRef = useRef(false);
  const persistenceQueueRef = useRef<Promise<void>>(Promise.resolve());

  const isCurrentGeneration = (generation: number) =>
    conversationGenerationRef.current === generation;

  const setActiveTicketId = (nextTicketId: string | null) => {
    ticketIdRef.current = nextTicketId;
    setTicketId(nextTicketId);
  };

  const setPendingConversation = (pending: boolean) => {
    pendingNewConversationRef.current = pending;
    setPendingNewConversation(pending);
  };

  // Active Order Check
  const { orders } = useOrders();
  const activeOrder = useMemo(() => {
    return orders.find(
      (o) =>
        (o.status || "").toLowerCase() !== "delivered" &&
        (o.status || "").toLowerCase() !== "cancelled"
    );
  }, [orders]);

  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages, aiTyping]);

  useEffect(() => {
    void loadStoredState();
  }, []);

  useEffect(() => {
    if (!storageHydrated) {
      return;
    }
    void loadActiveTicket(conversationGenerationRef.current);
  }, [storageHydrated]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!storageHydrated) {
      return;
    }
    void saveState(
      messages,
      ticketId,
      pendingNewConversation,
      conversationGenerationRef.current
    );
  }, [messages, ticketId, pendingNewConversation, storageHydrated]);

  useEffect(() => {
    const listenerGeneration = conversationGenerationRef.current;
    let active = true;
    if (!ticketId) {
      supportSocket.off("ticketMessage");
      supportSocket.off("ticketUpdated");
      return;
    }

    const handleTicketMessage = (payload: { ticketId?: string; message?: TicketMessage }) => {
      if (
        !isCurrentGeneration(listenerGeneration) ||
        !payload?.message ||
        payload.ticketId !== ticketId ||
        ticketIdRef.current !== ticketId
      ) {
        return;
      }
      const mapped = mapTicketMessageToChat(payload.message, Date.now());
      setMessages((prev) => {
        if (!isCurrentGeneration(listenerGeneration) || ticketIdRef.current !== ticketId) {
          return prev;
        }
        return mergeConversationMessages(prev, [mapped], {
          currentTicketId: ticketId,
          incomingTicketId: payload.ticketId,
        });
      });
    };

    const handleTicketUpdated = (ticket: TicketUpdate) => {
      if (
        !isCurrentGeneration(listenerGeneration) ||
        !ticket ||
        ticket.ticketId !== ticketId ||
        ticketIdRef.current !== ticketId
      ) {
        return;
      }
      if (ticket.status) setTicketStatus(ticket.status);
    };

    const handleSocketError = () => {
      logSupportSocketDiagnostic("socket_connect", "connect_error");
    };

    const joinTicketRoom = () => {
      if (active && isCurrentGeneration(listenerGeneration) && ticketIdRef.current === ticketId) {
        supportSocket.emit("joinTicket", ticketId, (result: { ok?: boolean } | undefined) => {
          if (active && result?.ok === false) logSupportSocketDiagnostic("join_ticket", "join_rejected");
        });
      }
    };

    supportSocket.on("ticketMessage", handleTicketMessage);
    supportSocket.on("ticketUpdated", handleTicketUpdated);
    supportSocket.on("connect_error", handleSocketError);
    supportSocket.on("connect", joinTicketRoom);
    
    void connectAuthenticatedSocket(supportSocket).then((connected) => {
      if (connected) {
        joinTicketRoom();
      } else if (active) {
        logSupportSocketDiagnostic("socket_connect", "missing_token");
      }
    });

    return () => {
      active = false;
      supportSocket.off("ticketMessage", handleTicketMessage);
      supportSocket.off("ticketUpdated", handleTicketUpdated);
      supportSocket.off("connect_error", handleSocketError);
      supportSocket.off("connect", joinTicketRoom);
    };
  }, [ticketId]);

  const saveState = async (
    nextMessages: ChatMessage[],
    nextTicketId: string | null,
    nextPendingNewConversation: boolean,
    generation: number
  ) => {
    const payload: StoredSupportState = {
      ticketId: nextTicketId,
      messages: nextMessages,
      pendingNewConversation: nextPendingNewConversation,
    };

    persistenceQueueRef.current = persistenceQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        if (!storageHydratedRef.current || !isCurrentGeneration(generation)) {
          return;
        }
        await AsyncStorage.setItem(SUPPORT_CHAT_STORAGE_KEY, JSON.stringify(payload));
      })
      .catch(() => {
        console.log("Failed to save chat");
      });

    await persistenceQueueRef.current;
  };

  const loadStoredState = async () => {
    try {
      const [stored, dismissedTicketId] = await Promise.all([
        AsyncStorage.getItem(SUPPORT_CHAT_STORAGE_KEY),
        AsyncStorage.getItem(DISMISSED_SUPPORT_TICKET_KEY),
      ]);

      dismissedTicketRef.current = parseDismissedTicketState(dismissedTicketId);

      if (!stored) {
        setPendingConversation(Boolean(dismissedTicketRef.current));
        return;
      }

      const parsed = JSON.parse(stored) as Partial<StoredSupportState>;
      setPendingConversation(
        Boolean(parsed.pendingNewConversation) ||
          Boolean(dismissedTicketRef.current && !parsed.ticketId)
      );
      if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        setMessages(
          parsed.messages.map((message, index) => ({
            id: String(message.id || `restored-${index}`),
            role:
              message.role === "user" || message.role === "admin"
                ? message.role
                : "assistant",
            text: String(message.text || ""),
            time:
              typeof message.time === "string" && message.time
                ? message.time
                : toTimeLabel(typeof message.createdAt === "string" ? message.createdAt : undefined),
            createdAt:
              typeof message.createdAt === "string" && message.createdAt
                ? message.createdAt
                : undefined,
          }))
        );
      }
      setActiveTicketId(
        typeof parsed.ticketId === "string" && parsed.ticketId ? parsed.ticketId : null
      );
    } catch {
      console.log("Failed to load chat");
    } finally {
      storageHydratedRef.current = true;
      setStorageHydrated(true);
    }
  };

  const loadActiveTicket = async (generation: number) => {
    try {
      const token = await getToken(false);
      if (!token) return;

      const data = await apiRequest<ActiveTicketResponse>("/support/tickets/active", {
        method: "GET",
        token,
      });

      if (!isCurrentGeneration(generation)) {
        return;
      }

      // A cleared conversation must not silently attach to the previously open ticket.
      if (pendingNewConversationRef.current) {
        return;
      }

      const dismissedState = dismissedTicketRef.current;
      if (
        data.ticket &&
        dismissedState &&
        data.ticket.id === dismissedState.ticketId &&
        data.ticket.messages.length <= dismissedState.messageCount
      ) {
        return;
      }

      if (data.ticket) {
        const expectedTicketId = ticketIdRef.current;
        if (expectedTicketId && data.ticket.id !== expectedTicketId) {
          return;
        }
        syncTicketState(data.ticket, { generation, expectedTicketId });
      }
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "SESSION_EXPIRED") {
        logSupportRequestDiagnostic("load_active_ticket", error);
      }
    }
  };

  const syncTicketState = (ticket: SupportTicket, options: TicketSyncOptions = {}) => {
    const generation = options.generation ?? conversationGenerationRef.current;
    if (!isCurrentGeneration(generation)) {
      return false;
    }

    const currentTicketId = ticketIdRef.current;
    if (
      (options.expectedTicketId && options.expectedTicketId !== ticket.id) ||
      (currentTicketId && currentTicketId !== ticket.id) ||
      (pendingNewConversationRef.current && !options.bindNewConversation)
    ) {
      return false;
    }

    const dismissedState = dismissedTicketRef.current;
    if (options.bindNewConversation && dismissedState?.ticketId === ticket.id) {
      return false;
    }

    setActiveTicketId(ticket.id);
    setTicketStatus(ticket.status);
    const ticketMessages = ticket.messages.map(mapTicketMessageToChat);
    setMessages((current) => {
      if (!isCurrentGeneration(generation) || ticketIdRef.current !== ticket.id) {
        return current;
      }
      if (ticketMessages.length === 0) {
        return current.length > 0 ? current : [starterMessage];
      }
      const baseMessages =
        current.length === 1 && current[0]?.id === starterMessage.id ? [] : current;
      return mergeConversationMessages(baseMessages, ticketMessages, {
        currentTicketId,
        incomingTicketId: ticket.id,
      });
    });

    if (options.bindNewConversation) {
      dismissedTicketRef.current = null;
      setPendingConversation(false);
      persistenceQueueRef.current = persistenceQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (isCurrentGeneration(generation) && !pendingNewConversationRef.current) {
            await AsyncStorage.removeItem(DISMISSED_SUPPORT_TICKET_KEY);
          }
        });
    }

    return true;
  };

  const appendTransientMessage = (
    role: ChatRole,
    text: string,
    generation = conversationGenerationRef.current
  ) => {
    if (!isCurrentGeneration(generation)) {
      return;
    }
    setMessages((prev) => {
      if (!isCurrentGeneration(generation)) {
        return prev;
      }
      return [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          role,
          text,
          time: toTimeLabel(),
        },
      ];
    });
  };

  const getToken = async (
    appendError = true,
    generation = conversationGenerationRef.current
  ) => {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      if (appendError && isCurrentGeneration(generation)) {
        appendTransientMessage("assistant", "Please log in again to use support.", generation);
      }
      return null;
    }
    return token;
  };

  const clearChat = async () => {
    const generation = conversationGenerationRef.current + 1;
    conversationGenerationRef.current = generation;
    const activeTicketId = ticketIdRef.current;
    const dismissedState: DismissedSupportTicketState | null = activeTicketId
      ? {
          ticketId: activeTicketId,
          messageCount: messages.filter(
            (message) => message.role !== "assistant" || message.createdAt
          ).length,
        }
      : dismissedTicketRef.current;

    dismissedTicketRef.current = dismissedState;
    setPendingConversation(true);
    setActiveTicketId(null);
    setTicketStatus(null);
    setMessages([starterMessage]);
    setLoading(false);
    setAiTyping(false);
    setRefreshing(false);
    supportSocket.off("ticketMessage");
    supportSocket.off("ticketUpdated");

    try {
      const clearedState: StoredSupportState = {
        ticketId: null,
        messages: [starterMessage],
        pendingNewConversation: true,
      };
      persistenceQueueRef.current = persistenceQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (!isCurrentGeneration(generation)) {
            return;
          }
          const writes: [string, string][] = [
            [SUPPORT_CHAT_STORAGE_KEY, JSON.stringify(clearedState)],
          ];
          if (dismissedState) {
            writes.push([
              DISMISSED_SUPPORT_TICKET_KEY,
              JSON.stringify(dismissedState),
            ]);
          }
          await AsyncStorage.multiSet(writes);
        });
      await persistenceQueueRef.current;
    } finally {
      showToast({ type: "success", title: "Chat cleared" });
    }
  };

  const escalateToHuman = async (
    message: string,
    reason = "User requested human support",
    options?: { forceNewTicket?: boolean; generation?: number }
  ) => {
    const generation = options?.generation ?? conversationGenerationRef.current;
    const token = await getToken(true, generation);
    if (!token) return;

    try {
      const escalateData = await apiRequest<SupportQueryResponse>("/support/escalate", {
        method: "POST",
        token,
        body: {
          message,
          reason,
          intent: "unknown",
          aiReply: "ESCALATE_TO_AGENT",
          forceNew: Boolean(options?.forceNewTicket),
        },
      });

      if (!isCurrentGeneration(generation)) {
        return;
      }

      if (escalateData.ticket) {
        const bound = syncTicketState(escalateData.ticket, {
          generation,
          bindNewConversation: Boolean(options?.forceNewTicket),
        });
        if (!bound) {
          return;
        }
        showToast({
          type: "success",
          title: "Support ticket created",
          message: "A live agent can reply from the dashboard now.",
        });
      }
    } catch (error) {
      if (!isCurrentGeneration(generation)) {
        return;
      }
      if (error instanceof Error && error.message === "SESSION_EXPIRED") {
        appendTransientMessage("assistant", "Your session expired. Please log in again.");
        return;
      }
      appendTransientMessage("assistant", "Could not create support ticket. Please try again.");
    }
  };

  const sendTicketMessage = async (
    text: string,
    generation = conversationGenerationRef.current,
    expectedTicketId = ticketIdRef.current
  ) => {
    const token = await getToken(true, generation);
    if (!token || !expectedTicketId || !isCurrentGeneration(generation)) return;

    const response = await apiRequest<TicketMessageResponse>("/support/tickets/message", {
      method: "POST",
      token,
      body: { ticketId: expectedTicketId, message: text },
    });
    if (!isCurrentGeneration(generation)) {
      return;
    }
    syncTicketState(response.ticket, {
      generation,
      expectedTicketId,
    });
  };

  const queryAssistant = async (
    text: string,
    options?: { forceNewTicket?: boolean; generation?: number }
  ): Promise<AssistantQueryResult> => {
    const generation = options?.generation ?? conversationGenerationRef.current;
    const token = await getToken(true, generation);
    if (!token) throw new Error("SESSION_EXPIRED");

    const supportData = await apiRequest<SupportQueryResponse>("/support/query", {
      method: "POST",
      token,
      body: {
        message: text,
        forceNew: Boolean(options?.forceNewTicket),
      },
    });

    if (!isCurrentGeneration(generation)) {
      return { stale: true };
    }

    if (supportData.response === "ESCALATE_TO_AGENT" || supportData.escalated) {
      if (supportData.ticket) {
        const bound = syncTicketState(supportData.ticket, {
          generation,
          bindNewConversation: Boolean(options?.forceNewTicket),
        });
        if (!bound) {
          return { stale: true };
        }
        return { escalated: true, handledInTicket: true };
      }
      await escalateToHuman(
        text,
        String(supportData.reason || "Escalated from support query"),
        options
      );
      if (!isCurrentGeneration(generation)) {
        return { stale: true };
      }
      return { escalated: true, handledInTicket: true };
    }

    return {
      escalated: false,
      response: String(supportData.response || "I could not process that request."),
    };
  };

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;

    const generation = conversationGenerationRef.current;
    const forceNewTicket = pendingNewConversationRef.current;
    const activeTicketId = ticketIdRef.current;

    setInput("");
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        role: "user",
        text,
        time: toTimeLabel(),
      },
    ]);
    setLoading(true);

    try {
      if (activeTicketId) {
        await sendTicketMessage(text, generation, activeTicketId);
        return;
      }
      setAiTyping(true);
      const assistantResult = await queryAssistant(text, { forceNewTicket, generation });
      if (!isCurrentGeneration(generation) || "stale" in assistantResult) {
        return;
      }
      if (assistantResult.escalated) return;
      if (ticketIdRef.current) {
        await sendTicketMessage(text, generation, ticketIdRef.current);
      }
      if (isCurrentGeneration(generation)) {
        appendTransientMessage("assistant", assistantResult.response);
      }
    } catch (error) {
      if (!isCurrentGeneration(generation)) {
        return;
      }
      if (error instanceof Error && error.message === "SESSION_EXPIRED") {
        appendTransientMessage("assistant", "Your session expired. Please log in again.");
      } else {
        logSupportRequestDiagnostic("send_message", error);
        appendTransientMessage("assistant", supportRequestFailureMessage(error));
      }
    } finally {
      if (isCurrentGeneration(generation)) {
        setAiTyping(false);
        setLoading(false);
      }
    }
  };

  const handleEscalatePress = async () => {
    if (loading || ticketIdRef.current) return;
    const generation = conversationGenerationRef.current;
    const forceNewTicket = pendingNewConversationRef.current;
    const text = input.trim() || "User requested to connect with support team";
    setInput("");
    setLoading(true);
    try {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          role: "user",
          text,
          time: toTimeLabel(),
        },
      ]);
      await escalateToHuman(text, "User requested human support", {
        forceNewTicket,
        generation,
      });
    } finally {
      if (isCurrentGeneration(generation)) {
        setLoading(false);
      }
    }
  };

  const refreshConversation = async () => {
    const generation = conversationGenerationRef.current;
    try {
      setRefreshing(true);
      await loadActiveTicket(generation);
      if (isCurrentGeneration(generation)) {
        showToast({ type: "success", title: "Support refreshed" });
      }
    } catch (error) {
      if (isCurrentGeneration(generation)) {
        handleError(error);
      }
    } finally {
      if (isCurrentGeneration(generation)) {
        setRefreshing(false);
      }
    }
  };

  const restingBottom = insets.bottom + APP_TAB_BAR_HEIGHT + 24;
  const inputBottom = keyboardHeight > 0 ? keyboardHeight + 12 : restingBottom;
  const listBottomPadding = INPUT_BAR_BASE_HEIGHT + inputBottom + (aiTyping ? 42 : 0);

  const quickActions = [
    { label: "Track my order", icon: "local-shipping", action: () => sendMessage("Where is my order?") },
    { label: "Pricing & Services", icon: "style", action: () => sendMessage("What are your prices and services?") },
    { label: "Order issue", icon: "error-outline", action: () => sendMessage("I have an issue with my order.") },
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View
          style={[
            styles.backgroundGlowTop,
            { backgroundColor: theme.primarySoft, opacity: isDark ? 0.15 : 0.6 },
          ]}
        />
        
        {/* Header */}
        <View style={styles.headerWrap}>
          <View style={[styles.headerIconWrap, { backgroundColor: isDark ? "rgba(37,99,235,0.15)" : "#EFF6FF" }]}>
            <MaterialIcons name="support-agent" size={24} color={theme.primary} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.header, { color: theme.text }]}>
              Support Chat
            </Text>
            <Text style={[styles.subheader, { color: theme.textMuted }]}>
              {ticketId ? "Live Support Active" : "We're here to help!"}
            </Text>
          </View>
          <TouchableOpacity style={styles.clearButton} onPress={clearChat}>
            <MaterialIcons name="more-horiz" size={24} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          style={styles.list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.messages, { paddingBottom: listBottomPadding }]}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { void refreshConversation(); }}
              tintColor={theme.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeaderComponent}>
              {/* Order Context Card */}
              {activeOrder && (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[
                    styles.orderCard,
                    {
                      backgroundColor: isDark ? "rgba(17,24,39,0.5)" : "rgba(255,255,255,0.7)",
                      borderColor: isDark ? "rgba(148,163,184,0.15)" : "rgba(255,255,255,0.9)",
                    },
                  ]}
                  onPress={() => {
                    router.push({
                      pathname: "/track-order",
                      params: { orderId: activeOrder._id, status: activeOrder.status },
                    });
                  }}
                >
                  <View style={styles.orderCardLeft}>
                    <View style={[styles.orderCardIcon, { backgroundColor: isDark ? "rgba(37,99,235,0.15)" : "#EFF6FF" }]}>
                      <MaterialIcons name="local-laundry-service" size={20} color={theme.primary} />
                    </View>
                    <View>
                      <Text style={[styles.orderCardTitle, { color: theme.text }]}>
                        Order #{activeOrder._id.slice(-6).toUpperCase()}
                      </Text>
                      <Text style={[styles.orderCardSubtitle, { color: theme.primary }]}>
                        {activeOrder.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.orderCardRight}>
                     <Text style={[styles.orderCardAction, { color: theme.primary }]}>View Details</Text>
                     <Feather name="chevron-right" size={16} color={theme.primary} />
                  </View>
                </TouchableOpacity>
              )}

              {/* Quick Actions */}
              {!ticketId && (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickActionsContainer}
                >
                  {quickActions.map((action, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.quickActionChip,
                        {
                          backgroundColor: isDark ? "rgba(17,24,39,0.5)" : "rgba(255,255,255,0.7)",
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={action.action}
                      disabled={loading}
                    >
                      <MaterialIcons name={action.icon as any} size={14} color={theme.primary} />
                      <Text style={[styles.quickActionText, { color: theme.text }]}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageRow,
                item.role === "user" ? styles.userWrap : styles.assistantWrap,
              ]}
            >
              {item.role !== "user" ? (
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0" },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: theme.primary }]}>
                    {item.role === "admin" ? "AD" : "AI"}
                  </Text>
                </View>
              ) : null}
              <Animated.View
                entering={FadeInDown.duration(180)}
                style={[
                  styles.bubbleWrap,
                  item.role === "user" ? styles.userBubbleWrap : styles.assistantBubbleWrap,
                ]}
              >
                <ChatBubble message={item} />
              </Animated.View>
            </View>
          )}
        />

        {/* Floating Composer Area */}
        <View style={[styles.composerArea, { bottom: inputBottom }]}>
          
          {/* Typing Indicator */}
          {aiTyping ? (
            <View style={styles.typingWrap}>
              <View style={[styles.avatar, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0" }]}>
                <Text style={[styles.avatarText, { color: theme.primary }]}>AI</Text>
              </View>
              <View
                style={[
                  styles.typingBubble,
                  {
                    backgroundColor: isDark ? "rgba(17,24,39,0.5)" : "rgba(255,255,255,0.7)",
                    borderColor: isDark ? "rgba(148,163,184,0.15)" : "rgba(0,0,0,0.06)",
                  },
                ]}
              >
                <Text style={[styles.typingText, { color: theme.textMuted }]}>Typing...</Text>
              </View>
            </View>
          ) : null}

          {/* Escalation Strip */}
          {!ticketId ? (
            <TouchableOpacity
              style={[
                styles.escalationStrip,
                {
                  backgroundColor: isDark ? "rgba(17,24,39,0.5)" : "rgba(255,255,255,0.7)",
                  borderColor: theme.border,
                },
              ]}
              activeOpacity={0.9}
              onPress={() => void handleEscalatePress()}
              disabled={loading}
            >
              <Text style={[styles.escalationText, { color: theme.textMuted }]}>
                Need more help?
              </Text>
              <View style={styles.escalationRight}>
                 <Text style={[styles.escalationAction, { color: theme.primary }]}>
                   Connect Support Team
                 </Text>
                 <Feather name="arrow-right" size={14} color={theme.primary} />
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Input Box */}
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: isDark ? "rgba(17,24,39,0.6)" : "rgba(255,255,255,0.8)",
                borderColor: theme.border,
              },
            ]}
          >
            <Ionicons name="attach" size={24} color={theme.textMuted} style={styles.attachIcon} />
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={ticketId ? "Message support team..." : "Type your message..."}
              placeholderTextColor={theme.textMuted}
              style={[
                styles.input,
                { color: theme.text },
              ]}
              editable={!loading}
              multiline
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={() => {
                void sendMessage();
              }}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: theme.primary },
                (!input.trim() || loading) && styles.sendButtonDisabled,
              ]}
              onPress={() => void sendMessage()}
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="send" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  backgroundGlowTop: {
    position: "absolute",
    top: -50,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  headerWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerCopy: { flex: 1 },
  header: {
    fontSize: 18,
    fontWeight: "700",
  },
  subheader: {
    fontSize: 13,
    marginTop: 2,
  },
  clearButton: {
    padding: 8,
  },
  list: { flex: 1 },
  messages: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  listHeaderComponent: {
    marginBottom: 24,
  },
  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  orderCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  orderCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  orderCardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  orderCardSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  orderCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  orderCardAction: {
    fontSize: 13,
    fontWeight: "600",
  },
  quickActionsContainer: {
    gap: 8,
    paddingRight: 20,
    marginBottom: 16,
  },
  quickActionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: "500",
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 2,
    alignItems: "flex-end",
  },
  userWrap: {
    justifyContent: "flex-end",
  },
  assistantWrap: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 10,
    fontWeight: "800",
  },
  bubbleWrap: {
    maxWidth: "80%",
  },
  userBubbleWrap: {
    alignItems: "flex-end",
  },
  assistantBubbleWrap: {
    alignItems: "flex-start",
  },
  composerArea: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 100,
  },
  typingWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  typingBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  typingText: {
    fontSize: 14,
    fontFamily: typography.medium,
  },
  escalationStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  escalationText: {
    fontSize: 13,
    fontWeight: "500",
  },
  escalationRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  escalationAction: {
    fontSize: 13,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 28,
    borderWidth: 1,
  },
  attachIcon: {
    paddingHorizontal: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 15,
    fontFamily: typography.body,
    paddingTop: 10,
    paddingBottom: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
