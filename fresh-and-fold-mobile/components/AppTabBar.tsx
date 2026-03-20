import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../hooks/useAppTheme";
import { radius, shadows, spacing, typography } from "../theme/theme";
import { triggerSelectionHaptic } from "../utils/haptics";

const TAB_BAR_HEIGHT = 82;
const HORIZONTAL_PADDING = 10;
const INDICATOR_GAP = 10;

const tabs = [
  { label: "Home", icon: "home-outline" as const, activeIcon: "home" as const, href: "/home" },
  { label: "Orders", icon: "receipt-outline" as const, activeIcon: "receipt" as const, href: "/order-history" },
  {
    label: "Support",
    icon: "chatbubble-ellipses-outline" as const,
    activeIcon: "chatbubble-ellipses" as const,
    href: "/support",
  },
  { label: "Profile", icon: "person-outline" as const, activeIcon: "person" as const, href: "/profile" },
];

export const APP_TAB_BAR_HEIGHT = TAB_BAR_HEIGHT;

type TabConfig = (typeof tabs)[number];

function TabButton({
  tab,
  active,
  theme,
  onPress,
}: {
  tab: TabConfig;
  active: boolean;
  theme: ReturnType<typeof useAppTheme>["theme"];
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      style={styles.tab}
      activeOpacity={0.86}
      onPress={() => {
        scale.value = withSequence(
          withTiming(1.16, { duration: 120 }),
          withTiming(1, { duration: 140 })
        );
        onPress();
      }}
    >
      <View style={styles.tabInner}>
        <Animated.View style={iconAnimatedStyle}>
          <Ionicons
            name={active ? tab.activeIcon : tab.icon}
            size={20}
            color={active ? theme.primary : theme.textMuted}
          />
        </Animated.View>
        <Text
          style={[
            styles.tabLabel,
            {
              color: active ? theme.primary : theme.textMuted,
            },
          ]}
        >
          {tab.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function AppTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const [barWidth, setBarWidth] = useState(0);
  const translateX = useSharedValue(HORIZONTAL_PADDING);

  const activeIndex = useMemo(
    () => Math.max(0, tabs.findIndex((tab) => tab.href === pathname)),
    [pathname]
  );

  const isVisible = tabs.some((tab) => tab.href === pathname);
  const tabSlotWidth = barWidth > 0 ? (barWidth - HORIZONTAL_PADDING * 2) / tabs.length : 0;
  const indicatorWidth = Math.max(0, tabSlotWidth - INDICATOR_GAP * 2);

  useEffect(() => {
    if (tabSlotWidth <= 0) {
      return;
    }

	    translateX.value = withSpring(
	      HORIZONTAL_PADDING + activeIndex * tabSlotWidth + INDICATOR_GAP,
	      {
	        damping: 16,
	        stiffness: 190,
	        mass: 0.72,
	      }
	    );
	  }, [activeIndex, tabSlotWidth, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: insets.bottom + 10,
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        onLayout={handleLayout}
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.tabBar,
            borderColor: theme.border,
            shadowColor: theme.shadow,
          },
        ]}
      >
        {indicatorWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              animatedStyle,
              {
                width: indicatorWidth,
                backgroundColor: theme.surface,
                borderColor: theme.border,
                shadowColor: theme.shadow,
              },
            ]}
          />
        ) : null}

        {tabs.map((tab, index) => {
          const active = pathname === tab.href;
          return (
            <TabButton
              key={tab.href}
              tab={tab}
              active={active}
              theme={theme}
              onPress={() => {
                void triggerSelectionHaptic();
                if (!active) {
                  router.replace(tab.href as never);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
  },
  tabBar: {
    height: TAB_BAR_HEIGHT,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: HORIZONTAL_PADDING,
    overflow: "hidden",
    ...shadows.floating,
  },
  indicator: {
    position: "absolute",
    top: 10,
    left: 0,
    height: TAB_BAR_HEIGHT - 20,
    borderRadius: radius.lg,
    borderWidth: 1,
    opacity: 0.95,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  tab: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: typography.semibold,
    letterSpacing: 0.1,
  },
});
