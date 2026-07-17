import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../hooks/useAppTheme";
import { typography } from "../theme/theme";
import { triggerSelectionHaptic } from "../utils/haptics";
import AICareLogo from "./AICareLogo";

const TAB_BAR_HEIGHT = 68;
const TAB_BAR_BOTTOM_OFFSET = 8;
const CENTER_BUTTON_PROTRUSION = 28;
const CONTENT_CLEARANCE = 32;

type StandardTab = {
  label: "Home" | "Orders" | "Support" | "Profile";
  icon: React.ComponentProps<typeof Ionicons>["name"];
  activeIcon: React.ComponentProps<typeof Ionicons>["name"];
  href: "/home" | "/order-history" | "/support" | "/profile";
};

type CenterTab = { label: "AI Care"; href: "/ai-care"; center: true };
type TabConfig = StandardTab | CenterTab;

const tabs: TabConfig[] = [
  { label: "Home", icon: "home-outline" as const, activeIcon: "home" as const, href: "/home" },
  { label: "Orders", icon: "receipt-outline" as const, activeIcon: "receipt" as const, href: "/order-history" },
  { label: "AI Care", href: "/ai-care", center: true },
  { label: "Support", icon: "headset-outline" as const, activeIcon: "headset" as const, href: "/support" },
  { label: "Profile", icon: "person-outline" as const, activeIcon: "person" as const, href: "/profile" },
];

export const APP_TAB_BAR_HEIGHT = TAB_BAR_HEIGHT;
// Home adds the device safe-area inset separately. This covers the full floating
// bar, its offset, the center bubble protrusion, and a clear visual gap.
export const APP_TAB_BAR_CONTENT_INSET =
  TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + CENTER_BUTTON_PROTRUSION + CONTENT_CLEARANCE;

function TabButton({ tab, active, onPress }: { tab: StandardTab; active: boolean; onPress: () => void }) {
  const { theme } = useAppTheme();
  const scale = useSharedValue(1);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={tab.label}
      style={styles.tab}
      activeOpacity={0.86}
      onPress={() => {
        scale.value = withSequence(withTiming(0.92, { duration: 100 }), withTiming(1, { duration: 150 }));
        onPress();
      }}
    >
      <Animated.View style={iconStyle}>
        <Ionicons name={active ? tab.activeIcon : tab.icon} size={20} color={active ? theme.primary : theme.textMuted} />
      </Animated.View>
      <Text style={[styles.label, { color: active ? theme.primary : theme.textMuted }]}>{tab.label}</Text>
    </TouchableOpacity>
  );
}

function CenterTabButton({ active, onPress }: { active: boolean; onPress: () => void }) {
  const { theme, isDark } = useAppTheme();
  const scale = useSharedValue(1);
  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel="AI Care"
      activeOpacity={0.88}
      style={styles.centerControl}
      onPress={() => {
        scale.value = withSequence(withTiming(0.93, { duration: 100 }), withTiming(1, { duration: 150 }));
        onPress();
      }}
    >
      <Animated.View
        style={[
          styles.centerLogoShell,
          buttonStyle,
          {
            backgroundColor: isDark ? "rgba(20,28,42,0.40)" : "rgba(255,255,255,0.12)",
            borderColor: active
              ? theme.primary
              : isDark ? "rgba(148,163,184,0.26)" : "rgba(219,234,254,0.80)",
            shadowColor: isDark ? "rgba(79,140,255,0.18)" : theme.primary,
          },
        ]}
      >
        <BlurView
          pointerEvents="none"
          intensity={isDark ? 28 : 36}
          tint={isDark ? "dark" : "light"}
          experimentalBlurMethod="dimezisBlurView"
          style={styles.absoluteFill}
        />
        <LinearGradient
          pointerEvents="none"
          colors={
            isDark
              ? ["rgba(79,140,255,0.08)", "rgba(15,23,42,0.03)"]
              : ["rgba(255,255,255,0.20)", "rgba(219,234,254,0.08)"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.absoluteFill}
        />
        <AICareLogo size={52} />
      </Animated.View>
      <Text style={[styles.centerLabel, { color: active ? theme.primary : theme.textMuted }]}>AI Care</Text>
    </TouchableOpacity>
  );
}

export default function AppTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const isVisible = tabs.some((tab) => tab.href === pathname);

  if (!isVisible) return null;

  const goTo = (href: TabConfig["href"]) => {
    void triggerSelectionHaptic();
    if (pathname !== href) router.replace(href as never);
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + TAB_BAR_BOTTOM_OFFSET }]} pointerEvents="box-none">
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: isDark ? "rgba(17,24,39,0.40)" : "rgba(255,255,255,0.10)",
            borderColor: isDark ? "rgba(148,163,184,0.16)" : "rgba(255,255,255,0.60)",
            shadowColor: isDark ? "transparent" : "#0F172A",
            shadowOpacity: isDark ? 0 : 0.08,
            shadowRadius: 15,
            shadowOffset: { width: 0, height: 8 },
            elevation: isDark ? 0 : 4,
          },
        ]}
      >
        <BlurView
          pointerEvents="none"
          intensity={isDark ? 26 : 40}
          tint={isDark ? "dark" : "light"}
          experimentalBlurMethod="dimezisBlurView"
          style={styles.absoluteFill}
        />
        {/* Translucent overlay */}
        <LinearGradient
          pointerEvents="none"
          colors={
            isDark
              ? ["rgba(30,41,59,0.25)", "rgba(15,23,42,0.10)"]
              : ["rgba(255,255,255,0.18)", "rgba(235,242,255,0.08)"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.absoluteFill}
        />
        {/* Top-edge highlight */}
        <LinearGradient
          pointerEvents="none"
          colors={
            isDark
              ? ["rgba(148,163,184,0.06)", "rgba(0,0,0,0)"]
              : ["rgba(255,255,255,0.22)", "rgba(255,255,255,0)"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.absoluteFill, { height: "50%" }]}
        />
        {tabs.map((tab) => {
          if ("center" in tab) {
            return <View key={tab.href} style={styles.centerSpacer} />;
          }
          return <TabButton key={tab.href} tab={tab} active={pathname === tab.href} onPress={() => goTo(tab.href)} />;
        })}
      </View>
      <CenterTabButton active={pathname === "/ai-care"} onPress={() => goTo("/ai-care")} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  tabBar: { height: TAB_BAR_HEIGHT, borderRadius: 24, borderWidth: 1, flexDirection: "row", alignItems: "center", overflow: "hidden", shadowOpacity: 0, elevation: 0 },
  tab: { flex: 1, height: "100%", alignItems: "center", justifyContent: "center", paddingTop: 2 },
  centerSpacer: { flex: 1 },
  label: { marginTop: 3, fontSize: 10.5, fontFamily: typography.semibold },
  centerControl: { position: "absolute", top: -28, alignSelf: "center", width: 86, height: 88, zIndex: 20, elevation: 0, alignItems: "center" },
  centerLogoShell: { width: 70, height: 70, borderRadius: 35, borderWidth: 1, overflow: "hidden", alignItems: "center", justifyContent: "center", padding: 7, shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  centerLabel: { marginTop: -1, fontSize: 10.5, fontFamily: typography.semibold },
  absoluteFill: { ...StyleSheet.absoluteFillObject },
});
