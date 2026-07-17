import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../../hooks/useAppTheme";

type HomeHeaderProps = {
  firstName: string;
  onNotificationsPress: () => void;
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning,";
  if (hour < 17) return "Good Afternoon,";
  if (hour < 22) return "Good Evening,";
  return "Good Night,";
}

function GlassCircle({
  onPress,
  accessibilityLabel,
  children,
}: {
  onPress?: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}) {
  const { theme, isDark } = useAppTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.glassButton, { backgroundColor: theme.headerButtonBg, borderColor: theme.headerButtonBorder }]}
      activeOpacity={0.84}
      onPress={onPress}
    >
      <BlurView pointerEvents="none" intensity={isDark ? 18 : 26} tint={isDark ? "dark" : "light"} style={styles.buttonBlur} />
      {children}
    </TouchableOpacity>
  );
}

export default function HomeHeader({ firstName, onNotificationsPress }: HomeHeaderProps) {
  const { theme, isDark } = useAppTheme();

  return (
    <View style={styles.container}>
      {/* Top row: Menu, Notifications, AI */}
      <View style={styles.topRow}>
        <GlassCircle accessibilityLabel="Menu">
          <Ionicons name="menu-outline" size={24} color={theme.text} />
        </GlassCircle>
        
        <View style={styles.rightControls}>
          <View>
            <GlassCircle onPress={onNotificationsPress} accessibilityLabel="Notifications">
              <Ionicons name="notifications-outline" size={21} color={theme.text} />
            </GlassCircle>
            {/* Notification indicator dot */}
            <View style={styles.notifDot} />
          </View>
          
          <GlassCircle accessibilityLabel="AI Assistant">
            <Ionicons name="sparkles-outline" size={20} color={theme.primary} />
          </GlassCircle>
        </View>
      </View>

      {/* Greeting + name */}
      <View style={styles.greetingBlock}>
        <Text style={[styles.greeting, { color: theme.textMuted }]}>{getGreeting()}</Text>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {firstName} 👋
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
  },
  rightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  glassButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonBlur: { ...StyleSheet.absoluteFillObject },
  notifDot: {
    position: "absolute",
    top: 6,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563EB",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.90)",
  },
  greetingBlock: {
    marginTop: 24,
  },
  greeting: {
    fontSize: 14,
    lineHeight: 18,
  },
  name: {
    marginTop: 2,
    fontSize: 28,
    lineHeight: 33,
    fontWeight: "700",
  },
});
