import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { memo, useEffect, useRef, type ComponentProps } from "react";
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import Animated, {
  cancelAnimation,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { AIRecommendation, ImpactMetrics } from "../../constants/homeContent";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useTactilePress } from "../../hooks/useTactilePress";
import type { OrderRecord } from "../../services/orderService";
import { homeDesign } from "../../theme/theme";
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

function getQuickActionHint(label: string) {
  if (label === "New Booking") return "Starts a new laundry pickup booking.";
  if (label === "Continue Booking") return "Resumes your saved booking draft.";
  if (label === "Bookings") return "No saved booking is currently in progress.";
  return `${label} is coming soon.`;
}

type QuickActionButtonProps = {
  label: string;
  subtitle: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  textColor: string;
  textMutedColor: string;
  iconBackgroundColor: string;
  iconBorderColor: string;
  accessibilityHint: string;
  compact: boolean;
  hasDivider: boolean;
  dividerColor: string;
  onPress: () => void;
};

function QuickActionButton({
  label,
  subtitle,
  icon,
  iconColor,
  textColor,
  textMutedColor,
  iconBackgroundColor,
  iconBorderColor,
  accessibilityHint,
  compact,
  hasDivider,
  dividerColor,
  onPress,
}: QuickActionButtonProps) {
  const { animatedStyle, onPressIn, onPressOut } = useTactilePress({ pressedScale: 0.96 });

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={[styles.quickAction, compact && styles.quickActionCompact, hasDivider && [styles.quickActionDivider, { borderRightColor: dividerColor }]]}
      activeOpacity={0.92}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View style={[styles.quickIcon, animatedStyle, { backgroundColor: iconBackgroundColor, borderColor: iconBorderColor }]}>
        <Ionicons name={icon} size={compact ? 21 : 23} color={iconColor} />
      </Animated.View>
      <Text maxFontSizeMultiplier={1.2} style={[styles.quickLabel, compact && styles.quickLabelCompact, { color: textColor }]} numberOfLines={2}>
        {label}
      </Text>
      <Text maxFontSizeMultiplier={1.15} style={[styles.quickSubtitle, compact && styles.quickSubtitleCompact, { color: textMutedColor }]} numberOfLines={2}>
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

export const QuickActions = memo(function QuickActions({ onNewBooking, bookingAction, onOffers, onRefer }: QuickActionsProps) {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const quickActions = [
    baseQuickActions[0],
    { key: "bookings", label: bookingAction.label, subtitle: bookingAction.subtitle, icon: "document-text-outline" as const, color: "success" as const },
    ...baseQuickActions.slice(1),
  ];
  const handlers: Record<string, () => void> = { new: onNewBooking, bookings: bookingAction.onPress, offers: onOffers, refer: onRefer };

  return (
    <View style={[styles.quickActions, { backgroundColor: theme.homeSurface, borderColor: theme.homeBorder }]}>
      {quickActions.map((action, index) => {
        const color = theme[action.color];
        return (
          <QuickActionButton
            key={action.key}
            label={action.label}
            subtitle={action.subtitle}
            icon={action.icon}
            iconColor={color}
            textColor={theme.text}
            textMutedColor={theme.textMuted}
            iconBackgroundColor={`${color}14`}
            iconBorderColor={`${color}30`}
            accessibilityHint={getQuickActionHint(action.label)}
            compact={compact}
            hasDivider={index < quickActions.length - 1}
            dividerColor={theme.homeBorder}
            onPress={handlers[action.key]}
          />
        );
      })}
    </View>
  );
});

type CurrentOrderCardProps = {
  order: OrderRecord | null;
  loading: boolean;
  error: Error | null;
  onTrack: () => void;
  onNewBooking: () => void;
  onRetry: () => void;
};

const timelineIcons = ["inventory-2", "local-laundry-service", "iron", "delivery-dining", "check"] as const;

type TimelineNodeProps = {
  index: number;
  currentStep: number | null;
  compact: boolean;
  iconColor: string;
  borderColor: string;
  backgroundColor: string;
  progress: SharedValue<number>;
  activeScale: SharedValue<number>;
};

function TimelineNode({ index, currentStep, compact, iconColor, borderColor, backgroundColor, progress, activeScale }: TimelineNodeProps) {
  const nodeStyle = useAnimatedStyle(() => {
    if (currentStep === null || index > currentStep) return {};
    const reveal = Math.max(0, Math.min(1, progress.value - index));
    return {
      opacity: 0.65 + reveal * 0.35,
      transform: [{ scale: (0.94 + reveal * 0.06) * (index === currentStep ? activeScale.value : 1) }],
    };
  });

  return (
    <Animated.View style={nodeStyle}>
      <View style={[
        styles.timelineNode,
        compact && styles.timelineNodeCompact,
        index === currentStep && styles.currentNode,
        { borderColor, backgroundColor },
      ]}>
        <MaterialIcons name={timelineIcons[index]} size={compact ? 15 : 17} color={iconColor} />
      </View>
    </Animated.View>
  );
}

type TimelineLineProps = {
  index: number;
  currentStep: number | null;
  progress: SharedValue<number>;
  borderColor: string;
  primaryColor: string;
};

function TimelineLine({ index, currentStep, progress, borderColor, primaryColor }: TimelineLineProps) {
  const fillStyle = useAnimatedStyle(() => {
    if (currentStep === null || index >= currentStep) return { opacity: 0 };
    return { opacity: Math.max(0, Math.min(1, progress.value - (index + 1))) };
  });

  return (
    <View style={[styles.timelineLine, { backgroundColor: borderColor }]}>
      <Animated.View style={[styles.timelineLineFill, fillStyle, { backgroundColor: primaryColor }]} />
    </View>
  );
}

function OrderTimeline({ orderId, currentStep }: { orderId: string; currentStep: number | null }) {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion && currentStep !== null ? currentStep + 1 : 0);
  const activeScale = useSharedValue(1);
  const previousStatus = useRef<{ orderId: string; currentStep: number | null } | null>(null);

  useEffect(() => {
    const target = currentStep === null ? 0 : currentStep + 1;
    const previous = previousStatus.current;
    const isForwardProgress = currentStep !== null && (
      !previous || previous.orderId !== orderId || previous.currentStep === null || currentStep > previous.currentStep
    );

    cancelAnimation(progress);
    cancelAnimation(activeScale);

    if (reducedMotion || currentStep === null || !isForwardProgress) {
      progress.value = target;
      activeScale.value = 1;
    } else {
      const start = previous && previous.orderId === orderId && previous.currentStep !== null ? previous.currentStep + 1 : 0;
      const duration = Math.min(420, 180 + Math.max(0, target - start) * 55);
      progress.value = start;
      progress.value = withTiming(target, {
        duration,
        reduceMotion: ReduceMotion.System,
      });
      activeScale.value = withDelay(
        Math.max(0, duration - 150),
        withSequence(
          withTiming(1.03, { duration: 100, reduceMotion: ReduceMotion.System }),
          withTiming(1, { duration: 120, reduceMotion: ReduceMotion.System }),
        ),
      );
    }

    previousStatus.current = { orderId, currentStep };
    return () => {
      cancelAnimation(progress);
      cancelAnimation(activeScale);
    };
  }, [activeScale, currentStep, orderId, progress, reducedMotion]);

  return (
    <View style={styles.timeline}>
      {HOME_ORDER_STEPS.map((step, index) => {
        const completed = currentStep !== null && index < currentStep;
        const current = index === currentStep;
        const active = completed || current;
        const iconColor = completed ? "#FFFFFF" : active ? theme.primary : theme.textMuted;
        return (
          <View key={step} style={styles.timelineStep}>
            <View style={styles.timelineVisual}>
              <TimelineNode
                index={index}
                currentStep={currentStep}
                compact={compact}
                iconColor={iconColor}
                borderColor={active ? theme.primary : theme.border}
                backgroundColor={completed ? theme.primary : current ? theme.primarySoft : theme.surfaceAlt}
                progress={progress}
                activeScale={activeScale}
              />
              {index < HOME_ORDER_STEPS.length - 1 ? (
                <TimelineLine index={index} currentStep={currentStep} progress={progress} borderColor={theme.border} primaryColor={theme.primary} />
              ) : null}
            </View>
            <Text maxFontSizeMultiplier={1.2} style={[styles.timelineLabel, compact && styles.timelineLabelCompact, { color: current ? theme.primary : completed ? theme.text : theme.textMuted }]} numberOfLines={2}>
              {step}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export const CurrentOrderCard = memo(function CurrentOrderCard({ order, loading, error, onTrack, onNewBooking, onRetry }: CurrentOrderCardProps) {
  const { theme, isDark } = useAppTheme();
  const cardStyle = [styles.orderCard, { backgroundColor: theme.homeSurfaceElevated, borderColor: theme.homeFeaturedBorder }];

  if (loading) {
    return (
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Loading current order"
        accessibilityState={{ busy: true }}
        style={[...cardStyle, styles.loadingCard]}
      >
        <View style={styles.loadingHeader}>
          <View style={[styles.loadingTitle, { backgroundColor: theme.surfaceAlt }]} />
          <View style={[styles.loadingBadge, { backgroundColor: theme.primarySoft }]} />
        </View>
        <View style={[styles.loadingMeta, { backgroundColor: theme.surfaceAlt }]} />
        <View style={styles.loadingTimeline}>
          {HOME_ORDER_STEPS.map((step) => <View key={step} style={[styles.loadingNode, { backgroundColor: theme.surfaceAlt }]} />)}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={cardStyle}>
        <Text style={[styles.orderEyebrow, { color: theme.textMuted }]}>CURRENT ORDER</Text>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>We couldn't load your order.</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Retry loading current order"
          accessibilityHint="Attempts to load your current order again."
          hitSlop={6}
          onPress={onRetry}
          style={[styles.inlineButton, { backgroundColor: theme.primarySoft }]}
        >
          <Text maxFontSizeMultiplier={1.2} style={[styles.inlineButtonText, { color: theme.primary }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={cardStyle}>
        <Text style={[styles.orderEyebrow, { color: theme.textMuted }]}>CURRENT ORDER</Text>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>No active orders</Text>
        <Text style={[styles.emptyCopy, { color: theme.textMuted }]}>Ready when you are.</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Start new booking"
          accessibilityHint="Starts a new laundry pickup booking."
          hitSlop={6}
          onPress={onNewBooking}
          style={[styles.inlineButton, { backgroundColor: theme.primarySoft }]}
        >
          <Text maxFontSizeMultiplier={1.2} style={[styles.inlineButtonText, { color: theme.primary }]}>Start New Booking</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = getHomeOrderStatus(order.status);
  const itemCount = getOrderItemCount(order);
  const orderNumber = typeof order._id === "string" && order._id ? order._id.slice(-6).toUpperCase() : "DETAILS";
  const statusBadgeColor = status.isKnown ? theme.primary : theme.textMuted;
  const statusBadgeBackground = status.isKnown ? theme.primarySoft : theme.surfaceAlt;
  const statusBadgeBorder = status.isKnown ? (isDark ? "#2B528F" : "#BFDBFE") : theme.border;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Current order ${orderNumber}. ${status.label}.`}
      accessibilityHint="Opens order tracking."
      style={cardStyle}
      activeOpacity={0.88}
      onPress={onTrack}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderIdentity}>
          <Text style={[styles.orderEyebrow, { color: theme.textMuted }]}>CURRENT ORDER</Text>
          <Text maxFontSizeMultiplier={1.25} style={[styles.orderId, { color: theme.text }]}>Order #{orderNumber}</Text>
          <Text maxFontSizeMultiplier={1.2} style={[styles.orderMeta, { color: theme.textMuted }]} numberOfLines={1}>
            {getOrderServiceLabel(order)}{itemCount ? ` \u2022 ${itemCount} items` : ""}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusBadgeBackground, borderColor: statusBadgeBorder }]}>
          <View style={[styles.badgeDot, { backgroundColor: statusBadgeColor }]} />
          <Text maxFontSizeMultiplier={1.2} style={[styles.statusBadgeText, { color: statusBadgeColor }]} numberOfLines={1}>{status.label}</Text>
        </View>
      </View>
      <OrderTimeline orderId={order._id} currentStep={status.currentStep} />
      <Text maxFontSizeMultiplier={1.25} style={[styles.statusCopy, { color: theme.textMuted }]}>{status.label}</Text>
    </TouchableOpacity>
  );
});

type RecommendationCardProps = { recommendation: AIRecommendation; onPress: () => void };

function RecommendationAction({ label, color, backgroundColor, onPress }: { label: string; color: string; backgroundColor: string; onPress: () => void }) {
  const { animatedStyle, onPressIn, onPressOut, pressProgress } = useTactilePress({ pressedScale: 0.98 });
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pressProgress.value * 3 }] }));

  return (
    <Animated.View style={[styles.recommendationActionWrapper, animatedStyle]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Starts a booking from this care recommendation."
        hitSlop={6}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.recommendationAction, { backgroundColor }]}
        activeOpacity={0.92}
      >
        <Text maxFontSizeMultiplier={1.2} style={[styles.recommendationActionText, { color }]}>{label}</Text>
        <Animated.View style={arrowStyle}>
          <MaterialIcons name="arrow-forward" size={19} color={color} />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export const RecommendationCard = memo(function RecommendationCard({ recommendation, onPress }: RecommendationCardProps) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.recommendationCard, { backgroundColor: theme.recommendationBg, borderColor: theme.recommendationBorder }]}>
      <View style={styles.recommendationContent}>
        <View style={styles.sectionRow}>
          <View style={[styles.sectionIcon, { backgroundColor: theme.recommendationSectionIconBg }]}>
            <MaterialIcons name="tips-and-updates" size={17} color={theme.recommendationSectionIconColor} />
          </View>
          <Text maxFontSizeMultiplier={1.2} style={[styles.sectionEyebrow, { color: theme.recommendationEyebrow }]}>AI RECOMMENDATION</Text>
          {recommendation.isDemo ? <Text style={[styles.demoLabel, { color: theme.recommendationDemoLabel }]}>DEMO</Text> : null}
        </View>
        <Text style={[styles.recommendationTitle, { color: theme.recommendationTitle }]}>{recommendation.title}</Text>
        <Text style={[styles.recommendationReason, { color: theme.recommendationReason }]}>{recommendation.reason}</Text>
        <RecommendationAction
          label={recommendation.actionLabel}
          color={theme.recommendationActionText}
          backgroundColor={theme.recommendationActionBg}
          onPress={onPress}
        />
      </View>
    </View>
  );
});

type ImpactCardProps = { impact: ImpactMetrics };

export const ImpactCard = memo(function ImpactCard({ impact }: ImpactCardProps) {
  const { theme } = useAppTheme();
  const values = [
    { label: "Water saved", value: `${impact.waterSavedLitres} L`, icon: "water-outline" as const, color: theme.primary },
    { label: "CO\u2082 prevented", value: `${impact.co2PreventedKg} kg`, icon: "leaf-outline" as const, color: theme.success },
    { label: "Time saved", value: `${impact.timeSavedHours} hrs`, icon: "time-outline" as const, color: theme.warning },
  ];
  return (
    <View style={[styles.impactCard, { backgroundColor: theme.homeSurfaceTint, borderColor: theme.homeBorder }]}>
      <View style={styles.impactHeader}>
        <Text style={[styles.impactTitle, { color: theme.text }]}>You're making a difference {"\u{1F30D}"}</Text>
        {impact.isDemo ? <Text style={[styles.impactDemoLabel, { color: theme.textMuted }]}>DEMO</Text> : null}
      </View>
      <View style={styles.impactRow}>
        {values.map((item, index) => (
          <View key={item.label} style={[styles.impactItem, index < values.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: theme.homeBorder }]}>
            <Ionicons name={item.icon} size={24} color={item.color} />
            <Text maxFontSizeMultiplier={1.2} style={[styles.impactValue, { color: theme.text }]}>{item.value}</Text>
            <Text maxFontSizeMultiplier={1.2} style={[styles.impactLabel, { color: theme.textMuted }]} numberOfLines={2}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  quickActions: { flexDirection: "row", marginTop: 12, borderRadius: homeDesign.actionRadius, borderWidth: 1, overflow: "hidden" },
  quickAction: { flex: 1, minHeight: 96, paddingHorizontal: 3, paddingVertical: 9, alignItems: "center", justifyContent: "flex-start" },
  quickActionDivider: { borderRightWidth: StyleSheet.hairlineWidth },
  quickActionCompact: { minHeight: 92, paddingHorizontal: 2, paddingVertical: 8 },
  quickIcon: { width: 38, height: 38, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  quickLabel: { minHeight: 26, fontSize: 11.5, fontWeight: "700", lineHeight: 13.5, letterSpacing: -0.15, textAlign: "center" },
  quickLabelCompact: { minHeight: 25, fontSize: 10.5, lineHeight: 12.5 },
  quickSubtitle: { marginTop: 2, fontSize: 9.5, lineHeight: 11.5, textAlign: "center" },
  quickSubtitleCompact: { marginTop: 1, fontSize: 8.75, lineHeight: 10.5 },
  orderCard: { marginTop: 12, borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 12 },
  loadingCard: { minHeight: 144, opacity: 0.72 },
  loadingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  loadingTitle: { width: "48%", height: 18, borderRadius: 6 },
  loadingBadge: { width: 82, height: 24, borderRadius: 12 },
  loadingMeta: { width: "58%", height: 12, borderRadius: 5, marginTop: 8 },
  loadingTimeline: { flexDirection: "row", justifyContent: "space-between", marginTop: 24 },
  loadingNode: { width: 28, height: 28, borderRadius: 14 },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", gap: 7 },
  orderIdentity: { flex: 1, minWidth: 0 },
  orderEyebrow: { fontSize: 10, lineHeight: 12, fontWeight: "600", letterSpacing: 0.55 },
  orderId: { marginTop: 4, fontSize: 19, lineHeight: 23, fontWeight: "700", letterSpacing: -0.5 },
  orderMeta: { marginTop: 3, fontSize: 12, lineHeight: 16 },
  statusBadge: { alignSelf: "flex-start", maxWidth: 126, minHeight: 26, borderRadius: 13, borderWidth: 1, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", marginTop: 1 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusBadgeText: { flexShrink: 1, fontSize: 10, fontWeight: "700" },
  timeline: { flexDirection: "row", marginTop: 12 },
  timelineStep: { flex: 1, minWidth: 0, alignItems: "center" },
  timelineVisual: { width: "100%", flexDirection: "row", alignItems: "center" },
  timelineNode: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  timelineNodeCompact: { width: 27, height: 27, borderRadius: 14 },
  currentNode: { borderWidth: 2 },
  timelineLine: { height: 1.5, flex: 1, marginHorizontal: 2, overflow: "hidden" },
  timelineLineFill: { ...StyleSheet.absoluteFillObject },
  timelineLabel: { width: "100%", marginTop: 4, paddingHorizontal: 1, fontSize: 8.5, lineHeight: 10.5, textAlign: "center" },
  timelineLabelCompact: { marginTop: 4, fontSize: 8, lineHeight: 10 },
  statusCopy: { marginTop: 6, fontSize: 11, lineHeight: 14 },
  emptyTitle: { marginTop: 8, fontSize: 19, fontWeight: "700", letterSpacing: -0.4 },
  emptyCopy: { marginTop: 4, fontSize: 12.5 },
  inlineButton: { alignSelf: "flex-start", marginTop: 12, minHeight: 38, borderRadius: 12, paddingHorizontal: 14, justifyContent: "center" },
  inlineButtonText: { fontSize: 13, fontWeight: "700" },
  recommendationCard: { marginTop: 12, borderRadius: homeDesign.actionRadius, borderWidth: 1 },
  recommendationContent: { flex: 1, padding: 14 },
  sectionRow: { flexDirection: "row", alignItems: "center" },
  sectionIcon: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 7 },
  sectionEyebrow: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },
  demoLabel: { marginLeft: "auto", fontSize: 9, fontWeight: "700", letterSpacing: 0.6 },
  recommendationTitle: { marginTop: 8, fontSize: 19, lineHeight: 24, fontWeight: "700", letterSpacing: -0.4 },
  recommendationReason: { marginTop: 5, fontSize: 12, lineHeight: 17 },
  recommendationActionWrapper: { alignSelf: "flex-start" },
  recommendationAction: { alignSelf: "flex-start", minHeight: 34, borderRadius: 12, paddingHorizontal: 12, marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  recommendationActionText: { fontSize: 11.5, fontWeight: "700" },
  impactCard: { minHeight: 106, marginTop: 12, marginBottom: 2, borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 12 },
  impactHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  impactTitle: { fontSize: 14, lineHeight: 18, fontWeight: "700", letterSpacing: -0.2 },
  impactDemoLabel: { marginLeft: "auto", fontSize: 10, fontWeight: "700", letterSpacing: 0.65 },
  impactRow: { flexDirection: "row" },
  impactItem: { flex: 1, alignItems: "center", paddingHorizontal: 3 },
  impactValue: { marginTop: 4, fontSize: 16, lineHeight: 19, fontWeight: "700", letterSpacing: -0.2 },
  impactLabel: { marginTop: 2, fontSize: 9, lineHeight: 11, textAlign: "center" },
});
