import { Ionicons } from "@expo/vector-icons";
import { memo, type ReactNode } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useTactilePress } from "../../hooks/useTactilePress";

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

function GlassCircle({ onPress, accessibilityLabel, accessibilityHint, children }: {
  onPress?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  children: ReactNode;
}) {
  const { theme } = useAppTheme();
  const { animatedStyle, onPressIn, onPressOut } = useTactilePress({ pressedScale: 0.96 });

  if (!onPress) {
    return (
      <View accessible={false} importantForAccessibility="no" style={[styles.control, { backgroundColor: theme.headerButtonBg, borderColor: theme.headerButtonBorder }]}>
        {children}
      </View>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={[styles.control, { backgroundColor: theme.headerButtonBg, borderColor: theme.headerButtonBorder }]}
        activeOpacity={0.92}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

function HomeHeader({ firstName, onNotificationsPress }: HomeHeaderProps) {
  const { theme, isDark } = useAppTheme();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <GlassCircle accessibilityLabel="Menu">
          <Ionicons name="menu-outline" size={24} color={theme.text} />
        </GlassCircle>
        <View style={styles.rightControls}>
          <View>
            <GlassCircle
              onPress={onNotificationsPress}
              accessibilityLabel="Notifications, unread"
              accessibilityHint="Opens your profile."
            >
              <Ionicons name="notifications-outline" size={21} color={theme.text} />
            </GlassCircle>
            <View accessible={false} style={[styles.notifDot, { backgroundColor: theme.primary, borderColor: isDark ? theme.headerButtonBg : "#FFFFFF" }]} />
          </View>
          <GlassCircle accessibilityLabel="AI Assistant">
            <Ionicons name="sparkles-outline" size={20} color={theme.primary} />
          </GlassCircle>
        </View>
      </View>
      <View style={styles.greetingBlock}>
        <Text maxFontSizeMultiplier={1.35} style={[styles.greeting, { color: theme.textMuted }]}>{getGreeting()}</Text>
        <Text maxFontSizeMultiplier={1.25} ellipsizeMode="tail" style={[styles.name, { color: theme.text }]} numberOfLines={1}>{firstName} {"\u{1F44B}"}</Text>
      </View>
    </View>
  );
}

export default memo(HomeHeader);

const styles = StyleSheet.create({
  container: { paddingBottom: 4 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 46 },
  rightControls: { flexDirection: "row", alignItems: "center", gap: 10 },
  control: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: { shadowColor: "#0F172A", shadowOpacity: 0.045, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  notifDot: { position: "absolute", top: 6, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: "#2563EB", borderWidth: 1.5, borderColor: "#FFFFFF" },
  greetingBlock: { marginTop: 18 },
  greeting: { fontSize: 17, lineHeight: 21, letterSpacing: -0.15 },
  name: { marginTop: 2, fontSize: 29, lineHeight: 35, fontWeight: "700", letterSpacing: -0.7 },
});
