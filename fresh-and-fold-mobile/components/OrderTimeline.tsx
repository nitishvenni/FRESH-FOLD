import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useAppTheme } from "../hooks/useAppTheme";
import { typography } from "../theme/theme";

type OrderTimelineProps = {
  steps: string[];
  currentStep: number;
};

// UI Display Mappings
const displayLabels: Record<string, string> = {
  "Scheduled": "Pickup Scheduled",
  "Received at Facility": "Received at Facility",
  "Picked Up": "Order Picked Up",
  "Washing": "Washing in Progress",
  "Ironing": "Ironing in Progress",
  "Out for Delivery": "Out for Delivery",
  "Delivered": "Order Delivered",
};

const displayDescriptions: Record<string, string> = {
  "Scheduled": "Your order has been scheduled successfully.",
  "Received at Facility": "Your clothes have reached our laundry facility.",
  "Picked Up": "Your clothes have been picked up by our partner.",
  "Washing": "We are washing your clothes with premium care.",
  "Ironing": "Your clothes will be pressed to perfection.",
  "Out for Delivery": "Your fresh clothes are on the way to you.",
  "Delivered": "Enjoy your fresh & folded clothes!",
};

type TimelineRowProps = {
  step: string;
  index: number;
  currentStep: number;
  isLast: boolean;
  theme: any;
};

function TimelineRow({
  step,
  index,
  currentStep,
  isLast,
  theme,
}: TimelineRowProps) {
  const isCompleted = index < currentStep;
  const isCurrent = index === currentStep;
  const isUpcoming = index > currentStep;

  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!isCurrent) {
      pulse.value = 1;
      return;
    }

    pulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      false
    );
  }, [isCurrent, pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const displayTitle = displayLabels[step] || step;
  const displayDescription = displayDescriptions[step] || "";

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(260)} style={styles.row}>
      <View style={styles.rail}>
        {/* State Indicator */}
        <Animated.View
          style={[
            styles.dotContainer,
            dotStyle,
            {
              backgroundColor: isCompleted
                ? theme.primary
                : isCurrent
                ? theme.primary
                : theme.surface,
              borderColor: isUpcoming ? theme.border : theme.primary,
              borderWidth: isUpcoming ? 1.5 : 0,
            },
          ]}
        >
          {isCompleted && (
            <MaterialIcons name="check" size={14} color="#FFFFFF" />
          )}
          {isCurrent && (
            <MaterialIcons name="local-laundry-service" size={12} color="#FFFFFF" />
          )}
        </Animated.View>

        {/* Connector Line */}
        {!isLast ? (
          <View
            style={[
              styles.line,
              { backgroundColor: isCompleted ? theme.primary : theme.border },
            ]}
          />
        ) : null}
      </View>

      <View style={styles.copyWrap}>
        <View style={styles.headerRow}>
          <Text
            style={[
              styles.label,
              {
                color: isUpcoming ? theme.textMuted : (isCurrent ? theme.primary : theme.text),
                fontFamily: isCurrent ? typography.bold : typography.semibold,
              },
            ]}
          >
            {displayTitle}
          </Text>
          {isCurrent && (
            <View style={[styles.badge, { backgroundColor: theme.primarySoft }]}>
              <Text style={[styles.badgeText, { color: theme.primary }]}>IN PROGRESS</Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.description,
            { color: theme.textMuted },
          ]}
        >
          {displayDescription}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function OrderTimeline({ steps, currentStep }: OrderTimelineProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.timelineContainer}>
      {steps.map((step, index) => (
        <TimelineRow
          key={step}
          step={step}
          index={index}
          currentStep={currentStep}
          isLast={index === steps.length - 1}
          theme={theme}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  timelineContainer: {
    paddingTop: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  rail: {
    width: 24,
    alignItems: "center",
    marginRight: 16,
  },
  dotContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 36,
  },
  copyWrap: {
    flex: 1,
    paddingTop: 2,
    paddingBottom: 24, // spacing between steps
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    fontSize: 15,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    paddingRight: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
