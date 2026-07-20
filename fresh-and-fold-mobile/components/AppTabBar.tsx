import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../hooks/useAppTheme";
import { useTactilePress } from "../hooks/useTactilePress";
import { typography } from "../theme/theme";
import { triggerSelectionHaptic } from "../utils/haptics";
import AICareLogo from "./AICareLogo";

const TAB_BAR_HEIGHT = 60;
const TAB_BAR_BOTTOM_OFFSET = 8;
const CENTER_BUTTON_PROTRUSION = 26;
const CONTENT_CLEARANCE = 24;

type StandardTab = {
  label: "Home" | "Orders" | "Support" | "Profile";
  icon: React.ComponentProps<typeof Ionicons>["name"];
  activeIcon: React.ComponentProps<typeof Ionicons>["name"];
  href: "/home" | "/order-history" | "/support" | "/profile";
};

type CenterTab = { label: "AI Care"; href: "/ai-care"; center: true };
type TabConfig = StandardTab | CenterTab;

const tabs: TabConfig[] = [
  { label: "Home", icon: "home-outline", activeIcon: "home", href: "/home" },
  { label: "Orders", icon: "receipt-outline", activeIcon: "receipt", href: "/order-history" },
  { label: "AI Care", href: "/ai-care", center: true },
  { label: "Support", icon: "headset-outline", activeIcon: "headset", href: "/support" },
  { label: "Profile", icon: "person-outline", activeIcon: "person", href: "/profile" },
];

export const APP_TAB_BAR_HEIGHT = TAB_BAR_HEIGHT;
export const APP_TAB_BAR_CONTENT_INSET = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + CENTER_BUTTON_PROTRUSION + CONTENT_CLEARANCE;

function TabButton({ tab, active, onPress }: { tab: StandardTab; active: boolean; onPress: () => void }) {
  const { theme } = useAppTheme();
  const { animatedStyle, onPressIn, onPressOut } = useTactilePress({ pressedScale: 0.96 });

  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${tab.label} tab`}
      accessibilityHint={`Navigates to ${tab.label}.`}
      style={styles.tab}
      activeOpacity={0.92}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <View style={[styles.iconBox, active && { backgroundColor: theme.primarySoft }]}>
        <Animated.View style={animatedStyle}>
          <Ionicons name={active ? tab.activeIcon : tab.icon} size={21} color={active ? theme.primary : theme.textMuted} />
        </Animated.View>
      </View>
      <Text maxFontSizeMultiplier={1.2} style={[styles.label, { color: active ? theme.primary : theme.textMuted }]}>{tab.label}</Text>
    </TouchableOpacity>
  );
}

function CenterTabButton({ active, onPress }: { active: boolean; onPress: () => void }) {
  const { theme, isDark } = useAppTheme();
  const { animatedStyle, onPressIn, onPressOut } = useTactilePress({ pressedScale: 0.94 });

  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel="AI Care tab"
      accessibilityHint="Navigates to AI Care."
      activeOpacity={0.92}
      style={styles.centerControl}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View
        style={[
          styles.centerLogoShell,
          animatedStyle,
          { backgroundColor: isDark ? "#17263B" : "#F8FBFF", borderColor: active ? theme.primary : theme.aiBubbleBorder },
        ]}
      >
        <View style={[styles.centerLogoRing, { borderColor: active ? theme.primary : isDark ? "#40516A" : "#D8E4F2" }]}>
          <AICareLogo size={48} />
        </View>
      </Animated.View>
      <Text maxFontSizeMultiplier={1.2} style={[styles.centerLabel, { color: active ? theme.primary : theme.textMuted }]}>AI Care</Text>
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
            backgroundColor: theme.tabBar,
            borderColor: theme.homeBorder,
            ...(isDark ? {} : styles.lightBarShadow),
          },
        ]}
      >
        {tabs.map((tab) => {
          if ("center" in tab) return <View key={tab.href} style={styles.centerSpacer} />;
          return <TabButton key={tab.href} tab={tab} active={pathname === tab.href} onPress={() => goTo(tab.href)} />;
        })}
      </View>
      <View pointerEvents="box-none" style={styles.centerAnchor}>
        <CenterTabButton active={pathname === "/ai-care"} onPress={() => goTo("/ai-care")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 12, zIndex: 8, elevation: 4 },
  tabBar: { height: TAB_BAR_HEIGHT, borderRadius: 24, borderWidth: 1, flexDirection: "row", alignItems: "center", zIndex: 1 },
  lightBarShadow: { shadowColor: "#0F172A", shadowOpacity: 0.045, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  tab: { flex: 1, height: "100%", alignItems: "center", justifyContent: "center", paddingTop: 2 },
  centerSpacer: { flex: 1 },
  iconBox: { width: 30, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  label: { marginTop: 2, fontSize: 10, fontFamily: typography.semibold },
  centerAnchor: { position: "absolute", top: -26, left: 0, right: 0, height: 82, alignItems: "center", zIndex: 20, elevation: 6 },
  centerControl: { width: 84, height: 82, alignItems: "center" },
  centerLogoShell: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  centerLogoRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  centerLabel: { marginTop: -1, fontSize: 10, fontFamily: typography.semibold },
});
