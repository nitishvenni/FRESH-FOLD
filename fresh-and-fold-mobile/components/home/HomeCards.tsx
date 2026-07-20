import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { AIRecommendation, ImpactMetrics } from "../../constants/homeContent";
import { useAppTheme } from "../../hooks/useAppTheme";
import { OrderRecord } from "../../services/orderService";
import { getHomeOrderStatus, getOrderItemCount, getOrderServiceLabel, HOME_ORDER_STEPS } from "../../utils/orderStatus";

type QuickActionsProps = {
  onNewBooking: () => void;
  bookingAction: { label: "Bookings" | "Continue Booking"; subtitle: string; onPress: () => void };
  onOffers: () => void;
  onRefer: () => void;
};

const baseQuickActions = [
  { key: "new", label: "New Booking", subtitle: "Start a pickup", icon: "calendar-outline" as const, color: "primary" as const },
  { key: "offers", label: "Offers", subtitle: "Coming soon", icon: "pricetag-outline" as const, color: "warning" as const },
  { key: "refer", label: "Refer & Earn", subtitle: "Coming soon", icon: "gift-outline" as const, color: "accent" as const },
] as const;

/** Premium glass surface: blur + translucent gradient overlay + top-edge highlight */
function GlassLayer({ isDark }: { isDark: boolean }) {
  return (
    <>
      <BlurView
        pointerEvents="none"
        intensity={isDark ? 28 : 36}
        tint={isDark ? "dark" : "light"}
        experimentalBlurMethod="dimezisBlurView"
        style={styles.absoluteFill}
      />
      {/* Translucent tinted overlay */}
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ["rgba(30,41,59,0.25)", "rgba(15,23,42,0.10)"]
            : ["rgba(255,255,255,0.20)", "rgba(240,245,255,0.10)"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.absoluteFill}
      />
      {/* Top edge highlight for glass depth */}
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ["rgba(148,163,184,0.08)", "rgba(0,0,0,0)"]
            : ["rgba(255,255,255,0.22)", "rgba(255,255,255,0)"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.absoluteFill, { height: "50%" }]}
      />
    </>
  );
}

function glassSurface(isDark: boolean) {
  return {
    shadowOpacity: 0,
    elevation: 0,
  };
}

export function QuickActions({ onNewBooking, bookingAction, onOffers, onRefer }: QuickActionsProps) {
  const { theme, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const quickActions = [
    baseQuickActions[0],
    { key: "bookings", label: bookingAction.label, subtitle: bookingAction.subtitle, icon: "document-text-outline" as const, color: "success" as const },
    ...baseQuickActions.slice(1),
  ];
  const handlers: Record<string, () => void> = { new: onNewBooking, bookings: bookingAction.onPress, offers: onOffers, refer: onRefer };

  return (
    <View
      style={[
        styles.quickActions,
        {
          backgroundColor: isDark ? "rgba(17,24,39,0.40)" : "rgba(255,255,255,0.08)",
          borderColor: isDark ? "rgba(148,163,184,0.18)" : "rgba(255,255,255,0.60)",
          elevation: 0,
          shadowOpacity: 0,
        },
      ]}
    >
      <BlurView
        pointerEvents="none"
        intensity={isDark ? 28 : 50}
        tint={isDark ? "dark" : "light"}
        experimentalBlurMethod="dimezisBlurView"
        blurReductionFactor={4}
        style={styles.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ["rgba(30,41,59,0.28)", "rgba(15,23,42,0.12)"]
            : ["rgba(255,255,255,0.20)", "rgba(240,245,255,0.10)"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ["rgba(79,140,255,0.04)", "rgba(0,0,0,0)"]
            : ["rgba(190,215,250,0.06)", "rgba(255,255,255,0)"]
        }
        start={{ x: 0.8, y: 0 }}
        end={{ x: 0.2, y: 1 }}
        style={styles.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ["rgba(148,163,184,0.06)", "rgba(0,0,0,0)"]
            : ["rgba(255,255,255,0.24)", "rgba(255,255,255,0)"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.absoluteFill, { height: "45%" }]}
      />
      {quickActions.map((action, index) => {
        const color = theme[action.color];
        return (
          <TouchableOpacity
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={[
              styles.quickAction,
              compact && styles.quickActionCompact,
              index < quickActions.length - 1 && {
                borderRightColor: isDark
                  ? "rgba(148,163,184,0.10)"
                  : "rgba(255,255,255,0.28)",
                borderRightWidth: StyleSheet.hairlineWidth,
              },
            ]}
            activeOpacity={0.8}
            onPress={handlers[action.key]}
          >
            <View
              style={[
                styles.quickIcon,
                {
                  backgroundColor: `${color}14`,
                  borderColor: `${color}30`,
                },
              ]}
            >
              <Ionicons name={action.icon} size={21} color={color} />
            </View>
            <Text allowFontScaling={false} style={[styles.quickLabel, compact && styles.quickLabelCompact, { color: theme.text }]} numberOfLines={2}>
              {action.label}
            </Text>
            <Text allowFontScaling={false} style={[styles.quickSubtitle, compact && styles.quickSubtitleCompact, { color: theme.textMuted }]} numberOfLines={2}>
              {action.subtitle}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

type CurrentOrderCardProps = {
  order: OrderRecord | null;
  loading: boolean;
  error: Error | null;
  onTrack: () => void;
  onNewBooking: () => void;
  onRetry: () => void;
};

const timelineIcons = ["inventory-2", "local-laundry-service", "iron", "delivery-dining", "check"] as const;

export function CurrentOrderCard({ order, loading, error, onTrack, onNewBooking, onRetry }: CurrentOrderCardProps) {
  const { theme, isDark } = useAppTheme();
  const cardStyle = [
    styles.orderCard,
    glassSurface(isDark),
    {
      backgroundColor: isDark ? "rgba(17,24,39,0.40)" : "rgba(255,255,255,0.08)",
      borderColor: isDark ? "rgba(148,163,184,0.18)" : "rgba(255,255,255,0.60)",
    },
  ];

  if (loading) {
    return (
      <View accessibilityLabel="Loading current order" style={[...cardStyle, styles.loadingCard]}>
        <GlassLayer isDark={isDark} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={cardStyle}>
        <GlassLayer isDark={isDark} />
        <Text style={[styles.orderEyebrow, { color: theme.textMuted }]}>CURRENT ORDER</Text>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>{"We couldn't load your order."}</Text>
        <TouchableOpacity onPress={onRetry} style={[styles.inlineButton, { backgroundColor: theme.primarySoft }]}>
          <Text style={[styles.inlineButtonText, { color: theme.primary }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={cardStyle}>
        <GlassLayer isDark={isDark} />
        <Text style={[styles.orderEyebrow, { color: theme.textMuted }]}>CURRENT ORDER</Text>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>No active orders</Text>
        <Text style={[styles.emptyCopy, { color: theme.textMuted }]}>Ready when you are.</Text>
        <TouchableOpacity onPress={onNewBooking} style={[styles.inlineButton, { backgroundColor: theme.primarySoft }]}>
          <Text style={[styles.inlineButtonText, { color: theme.primary }]}>Start New Booking</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = getHomeOrderStatus(order.status);
  const itemCount = getOrderItemCount(order);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Current order ${status.label}`}
      style={cardStyle}
      activeOpacity={0.88}
      onPress={onTrack}
    >
      <GlassLayer isDark={isDark} />
      <View style={styles.orderHeader}>
        <View style={styles.orderIdentity}>
          <Text style={[styles.orderEyebrow, { color: theme.textMuted }]}>CURRENT ORDER</Text>
          <Text style={[styles.orderId, { color: theme.text }]}>Order #{order._id.slice(-6).toUpperCase()}</Text>
          <Text style={[styles.orderMeta, { color: theme.textMuted }]} numberOfLines={1}>
            {getOrderServiceLabel(order)}{itemCount ? `  •  ${itemCount} items` : ""}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: theme.primarySoft }]}>
          <View style={[styles.badgeDot, { backgroundColor: theme.primary }]} />
          <Text style={[styles.statusBadgeText, { color: theme.primary }]} numberOfLines={1}>{status.label}</Text>
        </View>
      </View>
      <View style={styles.timeline} accessibilityLabel={`Order status: ${status.label}`}>
        {HOME_ORDER_STEPS.map((step, index) => {
          const completed = index < status.currentStep;
          const current = index === status.currentStep;
          const active = completed || current;
          const iconColor = completed ? "#FFFFFF" : active ? theme.primary : theme.textMuted;
          return (
            <View key={step} style={styles.timelineStep}>
              <View style={styles.timelineVisual}>
                <View
                  style={[
                    styles.timelineNode,
                    {
                      borderColor: active ? theme.primary : theme.border,
                      backgroundColor: completed ? theme.primary : current ? theme.primarySoft : theme.surfaceAlt,
                    },
                    current && [styles.currentNode, { shadowColor: theme.primary }],
                  ]}
                >
                  <MaterialIcons name={timelineIcons[index]} size={16} color={iconColor} />
                </View>
                {index < HOME_ORDER_STEPS.length - 1 ? <View style={[styles.timelineLine, { backgroundColor: completed ? theme.primary : theme.border }]} /> : null}
              </View>
              <Text style={[styles.timelineLabel, { color: current ? theme.primary : completed ? theme.text : theme.textMuted }]} numberOfLines={2}>{step}</Text>
            </View>
          );
        })}
      </View>
      <Text style={[styles.statusCopy, { color: theme.textMuted }]}>{status.label}</Text>
    </TouchableOpacity>
  );
}

type RecommendationCardProps = { recommendation: AIRecommendation; onPress: () => void };

export function RecommendationCard({ recommendation, onPress }: RecommendationCardProps) {
  const { theme, isDark } = useAppTheme();

  return (
    <View
      style={[
        styles.recommendationCard,
        glassSurface(isDark),
        {
          backgroundColor: isDark ? "rgba(16,40,77,0.40)" : "rgba(235,242,255,0.08)",
          borderColor: isDark ? "rgba(123,163,225,0.25)" : "rgba(147,197,253,0.35)",
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
            ? ["rgba(16,40,77,0.30)", "rgba(7,19,33,0.20)"]
            : ["rgba(255,255,255,0.18)", "rgba(219,234,254,0.10)"]
        }
        locations={[0, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ["rgba(79,140,255,0.10)", "rgba(0,0,0,0)"]
            : ["rgba(255,255,255,0.22)", "rgba(255,255,255,0)"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.absoluteFill, { height: "40%" }]}
      />
      <View style={styles.recommendationContent}>
        <View style={styles.sectionRow}>
          <View style={[styles.sectionIcon, { backgroundColor: theme.recommendationSectionIconBg }]}>
            <MaterialIcons name="tips-and-updates" size={15} color={theme.recommendationSectionIconColor} />
          </View>
          <Text style={[styles.sectionEyebrow, { color: theme.recommendationEyebrow }]}>AI RECOMMENDATION</Text>
          {recommendation.isDemo ? <Text style={[styles.demoLabel, { color: theme.recommendationDemoLabel }]}>DEMO</Text> : null}
        </View>
        <Text style={[styles.recommendationTitle, { color: theme.recommendationTitle }]}>{recommendation.title}</Text>
        <Text style={[styles.recommendationReason, { color: theme.recommendationReason }]}>{recommendation.reason}</Text>
        <TouchableOpacity
          onPress={onPress}
          style={[
            styles.recommendationAction,
            {
              backgroundColor: theme.recommendationActionBg,
              ...(isDark
                ? {}
                : Platform.select({
                    android: { elevation: 0 },
                    ios: { shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
                  })),
            },
          ]}
          activeOpacity={0.86}
        >
          <Text style={[styles.recommendationActionText, { color: theme.recommendationActionText }]}>{recommendation.actionLabel}</Text>
          <MaterialIcons name="arrow-forward" size={18} color={theme.recommendationActionText} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

type ImpactCardProps = { impact: ImpactMetrics };

export function ImpactCard({ impact }: ImpactCardProps) {
  const { theme, isDark } = useAppTheme();
  const values = [
    { label: "Water saved", value: `${impact.waterSavedLitres} L`, icon: "water-outline" as const, color: theme.primary },
    { label: "CO₂ prevented", value: `${impact.co2PreventedKg} kg`, icon: "leaf-outline" as const, color: theme.success },
    { label: "Time saved", value: `${impact.timeSavedHours} hrs`, icon: "time-outline" as const, color: theme.warning },
  ];
  return (
    <View
      style={[
        styles.impactCard,
        glassSurface(isDark),
        {
          backgroundColor: isDark ? "rgba(17,24,39,0.40)" : "rgba(255,255,255,0.08)",
          borderColor: isDark ? "rgba(148,163,184,0.18)" : "rgba(255,255,255,0.60)",
        },
      ]}
    >
      <GlassLayer isDark={isDark} />
      <LinearGradient
        pointerEvents="none"
        colors={isDark ? ["rgba(34,197,94,0.10)", "rgba(34,197,94,0)"] : ["rgba(147,197,253,0.08)", "rgba(255,255,255,0)"]}
        start={{ x: 0.8, y: 0 }}
        end={{ x: 0.15, y: 1 }}
        style={styles.absoluteFill}
      />
      <View style={styles.impactHeader}>
        <Text style={[styles.impactTitle, { color: theme.text }]}>{"You're making a difference 🌍"}</Text>
        {impact.isDemo ? <Text style={[styles.impactDemoLabel, { color: theme.textMuted }]}>DEMO</Text> : null}
      </View>
      <View style={styles.impactRow}>
        {values.map((item, index) => (
          <View key={item.label} style={[styles.impactItem, index < values.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: isDark ? "rgba(148,163,184,0.12)" : "rgba(200,210,230,0.40)" }]}>
            <Ionicons name={item.icon} size={22} color={item.color} />
            <Text style={[styles.impactValue, { color: theme.text }]}>{item.value}</Text>
            <Text style={[styles.impactLabel, { color: theme.textMuted }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteFill: { ...StyleSheet.absoluteFillObject },
  // Quick Actions
  quickActions: { flexDirection: "row", marginTop: 8, borderRadius: 20, borderWidth: 1, overflow: "hidden", shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  quickAction: { flex: 1, minHeight: 100, paddingHorizontal: 4, paddingVertical: 8, alignItems: "center", justifyContent: "flex-start" },
  quickActionCompact: { minHeight: 96, paddingHorizontal: 2, paddingVertical: 7 },
  quickIcon: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 5 },
  quickLabel: { minHeight: 26, fontSize: 11.5, fontWeight: "700", lineHeight: 13.5, textAlign: "center" },
  quickLabelCompact: { fontSize: 10.75, lineHeight: 13 },
  quickSubtitle: { marginTop: 2, fontSize: 9.5, lineHeight: 12, textAlign: "center" },
  quickSubtitleCompact: { marginTop: 1, fontSize: 9, lineHeight: 11 },
  // Current Order
  orderCard: { marginTop: 10, borderRadius: 20, borderWidth: 1, padding: 12, overflow: "hidden", shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  loadingCard: { minHeight: 150, opacity: 0.6 },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", gap: 7 },
  orderIdentity: { flex: 1, minWidth: 0 },
  orderEyebrow: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },
  orderId: { marginTop: 4, fontSize: 19, fontWeight: "700", letterSpacing: -0.45 },
  orderMeta: { marginTop: 3, fontSize: 12, lineHeight: 16 },
  statusBadge: { alignSelf: "flex-start", maxWidth: 124, minHeight: 26, borderRadius: 13, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", marginTop: 1 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusBadgeText: { flexShrink: 1, fontSize: 10, fontWeight: "700" },
  timeline: { flexDirection: "row", marginTop: 12 },
  timelineStep: { flex: 1, minWidth: 0, alignItems: "center" },
  timelineVisual: { width: "100%", flexDirection: "row", alignItems: "center" },
  timelineNode: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  currentNode: { shadowOpacity: 0.42, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  timelineLine: { height: 1.5, flex: 1, marginHorizontal: 2 },
  timelineLabel: { width: "100%", marginTop: 4, paddingHorizontal: 1, fontSize: 8.5, lineHeight: 10.5, textAlign: "center" },
  statusCopy: { marginTop: 6, fontSize: 11 },
  emptyTitle: { marginTop: 8, fontSize: 19, fontWeight: "700" },
  emptyCopy: { marginTop: 4, fontSize: 12.5 },
  inlineButton: { alignSelf: "flex-start", marginTop: 12, minHeight: 38, borderRadius: 12, paddingHorizontal: 14, justifyContent: "center" },
  inlineButtonText: { fontSize: 13, fontWeight: "700" },
  // Recommendation — premium glass
  recommendationCard: { marginTop: 12, borderRadius: 20, overflow: "hidden", borderWidth: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  recommendationContent: { flex: 1, padding: 14 },
  sectionRow: { flexDirection: "row", alignItems: "center" },
  sectionIcon: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 7 },
  sectionEyebrow: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },
  demoLabel: { marginLeft: "auto", fontSize: 9, fontWeight: "700", letterSpacing: 0.6 },
  recommendationTitle: { marginTop: 8, fontSize: 19, lineHeight: 24, fontWeight: "700", letterSpacing: -0.35 },
  recommendationReason: { marginTop: 5, fontSize: 11.5, lineHeight: 16 },
  recommendationAction: { alignSelf: "flex-start", minHeight: 34, borderRadius: 12, paddingHorizontal: 12, marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  recommendationActionText: { fontSize: 11.5, fontWeight: "700" },
  // Impact
  impactCard: { minHeight: 110, marginTop: 12, marginBottom: 2, borderRadius: 20, borderWidth: 1, padding: 12, overflow: "hidden", shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  impactHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  impactTitle: { fontSize: 14, fontWeight: "700", letterSpacing: -0.2 },
  impactDemoLabel: { marginLeft: "auto", fontSize: 10, fontWeight: "700", letterSpacing: 0.65 },
  impactRow: { flexDirection: "row" },
  impactItem: { flex: 1, alignItems: "center", paddingHorizontal: 3 },
  impactValue: { marginTop: 4, fontSize: 16, fontWeight: "700" },
  impactLabel: { marginTop: 2, fontSize: 9, textAlign: "center" },
});
