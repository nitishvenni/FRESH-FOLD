import { StyleSheet, Text, View } from "react-native";
import { colors, radius, typography } from "../theme/theme";

type ChatBubbleProps = {
  message: {
    role: "user" | "assistant" | "admin";
    text: string;
    time?: string;
  };
};

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const isAdmin = message.role === "admin";

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.user : isAdmin ? styles.admin : styles.bot,
      ]}
    >
      <Text style={[styles.text, isUser ? styles.userText : isAdmin ? styles.adminText : styles.botText]}>
        {message.text}
      </Text>
      {message.time ? (
        <Text
          style={[
            styles.time,
            isUser ? styles.userTime : isAdmin ? styles.adminTime : styles.botTime,
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
    backgroundColor: colors.primary,
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
  botText: {
    color: colors.textPrimary,
  },
  adminText: {
    color: "#4A3A00",
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
  botTime: {
    color: "rgba(17,17,17,0.45)",
  },
  adminTime: {
    color: "rgba(74,58,0,0.55)",
  },
});
