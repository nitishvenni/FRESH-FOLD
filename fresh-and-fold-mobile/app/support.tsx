import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
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
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { apiRequest } from "../utils/api";
import { supportSocket } from "../utils/socket";
import { APP_TAB_BAR_HEIGHT } from "../components/AppTabBar";
import ChatBubble from "../components/ChatBubble";
import EmptyStateAnimation from "../components/EmptyStateAnimation";
import { colors, radius, shadows, spacing, typography } from "../theme/theme";
import { handleError } from "../utils/errorHandler";
import { showToast } from "../utils/toast";

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
};

const starterMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Ask me about your order status, delivery charge, timings, services, turnaround, or placing an order.",
  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

const INPUT_BAR_BASE_HEIGHT = 104;
const SUPPORT_CHAT_STORAGE_KEY = "support_chat";

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

const mergeTicketMessages = (current: ChatMessage[], incoming: ChatMessage[]) => {
  const existingKeys = new Set(
    current
      .filter((message) => message.createdAt)
      .map((message) => `${message.role}|${message.text}|${message.createdAt}`)
  );

  const next = [...current];
  incoming.forEach((message) => {
    const messageKey = `${message.role}|${message.text}|${message.createdAt || ""}`;
    if (message.createdAt && existingKeys.has(messageKey)) {
      return;
    }
    if (message.createdAt) {
      existingKeys.add(messageKey);
    }
    next.push(message);
  });

  return next;
};

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([starterMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = useState<SupportTicket["status"] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages, aiTyping]);

  useEffect(() => {
    void loadStoredState();
    void loadActiveTicket();
  }, []);

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
    void saveState(messages, ticketId);
  }, [messages, ticketId]);

  useEffect(() => {
    if (!ticketId) {
      supportSocket.off("ticketMessage");
      supportSocket.disconnect();
      return;
    }

    if (!supportSocket.connected) {
      supportSocket.connect();
    }
    supportSocket.emit("joinTicket", ticketId);

    const handleTicketMessage = (payload: { ticketId?: string; message?: TicketMessage }) => {
      if (!payload?.message || payload.ticketId !== ticketId) {
        return;
      }

      const mapped = mapTicketMessageToChat(payload.message, Date.now());
      setMessages((prev) => mergeTicketMessages(prev, [mapped]));
    };

    const handleTicketUpdated = (ticket: SupportTicket) => {
      if (!ticket || ticket.id !== ticketId) {
        return;
      }

      setTicketStatus(ticket.status);
      setMessages(ticket.messages.map(mapTicketMessageToChat));
    };

    supportSocket.on("ticketMessage", handleTicketMessage);
    supportSocket.on("ticketUpdated", handleTicketUpdated);

    return () => {
      supportSocket.off("ticketMessage", handleTicketMessage);
      supportSocket.off("ticketUpdated", handleTicketUpdated);
      supportSocket.disconnect();
    };
  }, [ticketId]);

  const saveState = async (nextMessages: ChatMessage[], nextTicketId: string | null) => {
    try {
      const payload: StoredSupportState = {
        ticketId: nextTicketId,
        messages: nextMessages,
      };
      await AsyncStorage.setItem(SUPPORT_CHAT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      console.log("Failed to save chat");
    }
  };

  const loadStoredState = async () => {
    try {
      const stored = await AsyncStorage.getItem(SUPPORT_CHAT_STORAGE_KEY);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as Partial<StoredSupportState>;
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

      setTicketId(typeof parsed.ticketId === "string" && parsed.ticketId ? parsed.ticketId : null);
    } catch {
      console.log("Failed to load chat");
    }
  };

  const loadActiveTicket = async () => {
    try {
      const token = await getToken(false);
      if (!token) {
        return;
      }

      const data = await apiRequest<ActiveTicketResponse>("/support/tickets/active", {
        method: "GET",
        token,
      });

      if (data.ticket) {
        syncTicketState(data.ticket);
      }
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "SESSION_EXPIRED") {
        console.log("Failed to load active ticket");
      }
    }
  };

  const syncTicketState = (ticket: SupportTicket) => {
    setTicketId(ticket.id);
    setTicketStatus(ticket.status);
    const ticketMessages = ticket.messages.map(mapTicketMessageToChat);
    setMessages(ticketMessages.length > 0 ? ticketMessages : [starterMessage]);
  };

  const appendTransientMessage = (role: ChatRole, text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        role,
        text,
        time: toTimeLabel(),
      },
    ]);
  };

  const getToken = async (appendError = true) => {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      if (appendError) {
        appendTransientMessage("assistant", "Please log in again to use support.");
      }
      return null;
    }

    return token;
  };

  const clearChat = async () => {
    try {
      await AsyncStorage.removeItem(SUPPORT_CHAT_STORAGE_KEY);
    } finally {
      setTicketId(null);
      setTicketStatus(null);
      setMessages([starterMessage]);
      showToast({
        type: "success",
        title: "Chat cleared",
      });
    }
  };

  const escalateToHuman = async (
    message: string,
    reason = "User requested human support"
  ) => {
    const token = await getToken();
    if (!token) {
      return;
    }

    try {
      const escalateData = await apiRequest<SupportQueryResponse>("/support/escalate", {
        method: "POST",
        token,
        body: {
          message,
          reason,
          intent: "unknown",
          aiReply: "ESCALATE_TO_AGENT",
        },
      });

      if (escalateData.ticket) {
        syncTicketState(escalateData.ticket);
        showToast({
          type: "success",
          title: "Support ticket created",
          message: "A live agent can reply from the dashboard now.",
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message === "SESSION_EXPIRED") {
        appendTransientMessage("assistant", "Your session expired. Please log in again.");
        return;
      }

      appendTransientMessage("assistant", "Could not create support ticket. Please try again.");
    }
  };

  const sendTicketMessage = async (text: string) => {
    const token = await getToken();
    if (!token || !ticketId) {
      return;
    }

    const response = await apiRequest<TicketMessageResponse>("/support/tickets/message", {
      method: "POST",
      token,
      body: {
        ticketId,
        message: text,
      },
    });

    syncTicketState(response.ticket);
  };

  const queryAssistant = async (text: string): Promise<AssistantQueryResult> => {
    const token = await getToken();
    if (!token) {
      throw new Error("SESSION_EXPIRED");
    }

    const supportData = await apiRequest<SupportQueryResponse>("/support/query", {
      method: "POST",
      token,
      body: { message: text },
    });

    if (supportData.response === "ESCALATE_TO_AGENT" || supportData.escalated) {
      if (supportData.ticket) {
        syncTicketState(supportData.ticket);
        return {
          escalated: true,
          handledInTicket: true,
        };
      }

      await escalateToHuman(text, String(supportData.reason || "Escalated from support query"));
      return {
        escalated: true,
        handledInTicket: true,
      };
    }

    return {
      escalated: false,
      response: String(supportData.response || "I could not process that request."),
    };
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) {
      return;
    }

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
      setAiTyping(true);
      const assistantResult = await queryAssistant(text);

      if (assistantResult.escalated) {
        return;
      }

      if (ticketId) {
        await sendTicketMessage(text);
      }

      appendTransientMessage("assistant", assistantResult.response);
    } catch (error) {
      if (error instanceof Error && error.message === "SESSION_EXPIRED") {
        appendTransientMessage("assistant", "Your session expired. Please log in again.");
      } else {
        appendTransientMessage("assistant", "Network error. Please try again.");
      }
    } finally {
      setAiTyping(false);
      setLoading(false);
    }
  };

  const handleEscalatePress = async () => {
    if (loading || ticketId) {
      return;
    }

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
      await escalateToHuman(text);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectAdminMessage = async () => {
    const text = input.trim();
    if (!text || !ticketId || loading) {
      return;
    }

    setInput("");
    setLoading(true);
    try {
      await sendTicketMessage(text);
    } catch (error) {
      if (error instanceof Error && error.message === "SESSION_EXPIRED") {
        appendTransientMessage("assistant", "Your session expired. Please log in again.");
      } else {
        appendTransientMessage("assistant", "Could not send message to support team.");
      }
    } finally {
      setLoading(false);
    }
  };

  const restingBottom = insets.bottom + APP_TAB_BAR_HEIGHT + 18;
  const inputBottom = keyboardHeight > 0 ? keyboardHeight : restingBottom;
  const listBottomPadding = INPUT_BAR_BASE_HEIGHT + restingBottom + (aiTyping ? 42 : 0);

  const refreshConversation = async () => {
    try {
      setRefreshing(true);
      await loadActiveTicket();
      showToast({
        type: "success",
        title: "Support refreshed",
      });
    } catch (error) {
      handleError(error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <Text style={styles.header}>{ticketId ? "Live Support Chat" : "Support Assistant"}</Text>
        <Text style={styles.subheader}>
          {ticketId
            ? `AI first, live support active${ticketStatus ? ` - ${ticketStatus}` : ""}`
            : "Live AI help for orders, pricing, and delivery updates."}
        </Text>
        <TouchableOpacity style={styles.clearButton} onPress={clearChat}>
          <Text style={styles.clearButtonText}>
            {ticketId ? "Clear Local Chat" : "Clear Chat"}
          </Text>
        </TouchableOpacity>

	        <FlatList
	          ref={listRef}
	          data={messages}
	          keyExtractor={(item) => item.id}
	          contentContainerStyle={[styles.messages, { paddingBottom: listBottomPadding }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  void refreshConversation();
                }}
                tintColor={colors.primary}
              />
            }
            ListHeaderComponent={
              !ticketId && messages.length <= 1 ? (
                <View style={styles.emptyState}>
                  <EmptyStateAnimation icon="support-agent" />
                  <Text style={styles.emptyStateTitle}>Support is ready</Text>
                  <Text style={styles.emptyStateCopy}>
                    Ask anything about order status, pricing, pickups, or request a live agent.
                  </Text>
                </View>
              ) : null
            }
	          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
	          keyboardShouldPersistTaps="handled"
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
                    item.role === "admin" ? styles.adminAvatar : styles.assistantAvatar,
                  ]}
                >
                  <Text style={styles.avatarText}>{item.role === "admin" ? "AD" : "AI"}</Text>
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
	              {item.role === "user" ? (
	                <View style={[styles.avatar, styles.userAvatar]}>
                  <Text style={styles.userAvatarText}>You</Text>
                </View>
              ) : null}
            </View>
          )}
        />

        <View style={[styles.composerArea, { bottom: inputBottom }]}>
	          {aiTyping ? (
	            <View style={styles.typingWrap}>
	              <View style={[styles.avatar, styles.assistantAvatar]}>
	                <Text style={styles.avatarText}>AI</Text>
	              </View>
	              <View style={styles.typingBubble}>
	                <Text style={styles.typingText}>Typing...</Text>
	              </View>
	            </View>
          ) : null}

          <View style={styles.inputSection}>
            <View style={styles.inputRow}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={ticketId ? "Message support team..." : "Ask something..."}
                style={styles.input}
                editable={!loading}
                multiline
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  void sendMessage();
                }}
              />

              <TouchableOpacity
                style={[styles.sendButton, loading && styles.buttonDisabled]}
                onPress={() => {
                  void sendMessage();
                }}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
            {!ticketId ? (
              <TouchableOpacity
                style={[styles.escalateButton, loading && styles.buttonDisabled]}
                disabled={loading}
                onPress={() => {
                  void handleEscalatePress();
                }}
              >
                <Text style={styles.escalateText}>Connect Support Team</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.escalateButton, loading && styles.buttonDisabled]}
                disabled={loading}
                onPress={() => {
                  void handleDirectAdminMessage();
                }}
              >
                <Text style={styles.escalateText}>Send Directly to Admin</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    fontSize: 22,
    fontFamily: typography.bold,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
    marginBottom: 4,
  },
  subheader: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: typography.body,
    paddingHorizontal: spacing.lg,
    marginBottom: 8,
  },
  clearButton: {
    alignSelf: "flex-end",
    marginRight: spacing.lg,
    marginBottom: 8,
    paddingVertical: 6,
  },
  clearButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: typography.semibold,
  },
  messages: {
    padding: spacing.md,
    gap: 10,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: typography.bold,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptyStateCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
  messageRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  userWrap: {
    justifyContent: "flex-end",
  },
	  assistantWrap: {
	    justifyContent: "flex-start",
	  },
	  bubbleWrap: {
	    maxWidth: "75%",
	    minWidth: 60,
	    flexShrink: 1,
	  },
	  userBubbleWrap: {
	    alignItems: "flex-end",
	  },
	  assistantBubbleWrap: {
	    alignItems: "flex-start",
	  },
	  avatar: {
	    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  assistantAvatar: {
    marginRight: 6,
    backgroundColor: "#D9D1C7",
  },
  adminAvatar: {
    marginRight: 6,
    backgroundColor: "#F4D35E",
  },
  userAvatar: {
    marginLeft: 6,
    backgroundColor: "#111111",
  },
  avatarText: {
    color: "#3E352B",
    fontSize: 11,
    fontFamily: typography.bold,
  },
  userAvatarText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: typography.bold,
  },
  composerArea: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  typingWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: "center",
    flexDirection: "row",
  },
  typingBubble: {
    maxWidth: "60%",
    borderRadius: radius.lg - 2,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E8DED1",
  },
  typingText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontStyle: "italic",
  },
  inputSection: {
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF",
    padding: spacing.sm,
    gap: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: typography.body,
    color: colors.textPrimary,
    maxHeight: 110,
    minHeight: 40,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: colors.success,
    minWidth: 58,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  sendText: {
    color: "#FFFFFF",
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  escalateButton: {
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: radius.md,
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#F7EFE3",
    ...shadows.card,
  },
  escalateText: {
    color: "#222222",
    fontFamily: typography.semibold,
  },
});
