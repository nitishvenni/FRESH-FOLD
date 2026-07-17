import { StyleSheet, Text, View } from "react-native";
import { radius, typography } from "../theme/theme";
import { useAppTheme } from "../hooks/useAppTheme";
import { MaterialIcons } from "@expo/vector-icons";

type ChatBubbleProps = {
  message: {
    role: "user" | "assistant" | "admin";
    text: string;
    time?: string;
  };
};

export default function ChatBubble({ message }: ChatBubbleProps) {
  const { theme, isDark } = useAppTheme();
  const isUser = message.role === "user";
  const isAdmin = message.role === "admin";

  const userBg = isDark ? "rgba(37,99,235,0.2)" : "rgba(37,99,235,0.12)";
  const userBorder = isDark ? "rgba(37,99,235,0.3)" : "rgba(37,99,235,0.2)";
  
  const botBg = isDark ? "rgba(17,24,39,0.5)" : "rgba(255,255,255,0.7)";
  const botBorder = isDark ? "rgba(148,163,184,0.15)" : "rgba(0,0,0,0.06)";

  const adminBg = isDark ? "rgba(245,158,11,0.15)" : "rgba(254,243,199,0.7)";
  const adminBorder = isDark ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.2)";

  let containerBg = botBg;
  let containerBorder = botBorder;

  if (isUser) {
    containerBg = userBg;
    containerBorder = userBorder;
  } else if (isAdmin) {
    containerBg = adminBg;
    containerBorder = adminBorder;
  }

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.user : styles.bot,
        {
          backgroundColor: containerBg,
          borderColor: containerBorder,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: theme.text }, // Dark mode white, light mode navy/charcoal for great readability in both
        ]}
      >
        {message.text}
      </Text>
      
      {message.time ? (
        <View style={styles.footerRow}>
          <Text
            style={[
              styles.time,
              { color: isUser ? (isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)") : theme.textMuted },
            ]}
          >
            {message.time}
          </Text>
          {isUser && (
             <MaterialIcons 
               name="done-all" 
               size={12} 
               color={isDark ? "rgba(255,255,255,0.5)" : theme.primary} 
               style={{ marginLeft: 4, marginTop: 4 }}
             />
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    minWidth: 80,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  user: {
    borderBottomRightRadius: 4,
  },
  bot: {
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: typography.body,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  time: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
    fontFamily: typography.medium,
  },
});
