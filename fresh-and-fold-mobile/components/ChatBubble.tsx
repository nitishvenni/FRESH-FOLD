import { StyleSheet, Text, View } from "react-native";
import { radius, typography } from "../theme/theme";
import { useAppTheme } from "../hooks/useAppTheme";

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

  return (
    <View
      style={[
        styles.container,
        isUser
          ? [styles.user, { backgroundColor: theme.primary }]
          : isAdmin
            ? [
                styles.admin,
                {
                  backgroundColor: isDark ? theme.surfaceAlt : theme.primarySoft,
                  borderColor: theme.primary,
                },
              ]
            : [
                styles.bot,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ],
      ]}
    >
      <Text
        style={[
          styles.text,
          isUser
            ? styles.userText
            : {
                color: theme.text,
              },
        ]}
      >
        {message.text}
      </Text>
      {message.time ? (
        <Text
          style={[
            styles.time,
            isUser
              ? styles.userTime
              : {
                  color: theme.textMuted,
                },
          ]}
        >
          {message.time}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    minWidth: 60,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderRadius: radius.lg - 2,
  },
  user: {
    borderBottomRightRadius: 4,
  },
  bot: {
    backgroundColor: "#F3F4F6",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  admin: {
    backgroundColor: "#FFF3C4",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E5C95C",
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: typography.body,
  },
  userText: {
    color: "#FFFFFF",
  },
  time: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
    fontFamily: typography.medium,
    opacity: 0.7,
  },
  userTime: {
    color: "rgba(255,255,255,0.75)",
  },
});
