import { useEffect } from "react";
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

type TimelineRowProps = {
  step: string;
  index: number;
  currentStep: number;
  isLast: boolean;
  successColor: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
};

function TimelineRow({
  step,
  index,
  currentStep,
  isLast,
  successColor,
  borderColor,
  textColor,
  mutedColor,
}: TimelineRowProps) {
  const isCompleted = index < currentStep;
  const isCurrent = index === currentStep;
  const isActive = index <= currentStep;
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!isCurrent) {
      pulse.value = 1;
      return;
    }

    pulse.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 700 }),
        withTiming(1, { duration: 700 })
      ),
      -1,
      false
    );
  }, [isCurrent, pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(260)} style={styles.row}>
      <View style={styles.rail}>
        <Animated.View
          style={[
            styles.dot,
            dotStyle,
            {
              backgroundColor: isActive ? successColor : borderColor,
              borderColor: isCurrent ? successColor : "transparent",
              borderWidth: isCurrent ? 3 : 0,
            },
          ]}
        />
        {!isLast ? (
          <View
            style={[
              styles.line,
              {
                backgroundColor: isCompleted ? successColor : borderColor,
              },
            ]}
          />
        ) : null}
      </View>
      <View style={styles.copyWrap}>
        <Text
          style={[
            styles.label,
            {
              color: isActive ? textColor : mutedColor,
              fontFamily: isActive ? typography.semibold : typography.medium,
            },
          ]}
        >
          {step}
        </Text>
        {isCurrent ? (
          <Text style={[styles.meta, { color: successColor }]}>In progress</Text>
        ) : isCompleted ? (
          <Text style={[styles.meta, { color: successColor }]}>Completed</Text>
        ) : (
          <Text style={[styles.meta, { color: mutedColor }]}>Upcoming</Text>
        )}
      </View>
    </Animated.View>
  );
}

export default function OrderTimeline({
  steps,
  currentStep,
}: OrderTimelineProps) {
  const { theme } = useAppTheme();

  return (
    <View>
      {steps.map((step, index) => (
        <TimelineRow
          key={step}
          step={step}
          index={index}
          currentStep={currentStep}
          isLast={index === steps.length - 1}
          successColor={theme.success}
          borderColor={theme.border}
          textColor={theme.text}
          mutedColor={theme.textMuted}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  rail: {
    width: 20,
    alignItems: "center",
    marginRight: 12,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 999,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 30,
    marginTop: 4,
  },
  copyWrap: {
    flex: 1,
    paddingTop: 1,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
  },
  meta: {
    marginTop: 3,
    fontSize: 12,
    fontFamily: typography.medium,
  },
});
