import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { useAppTheme } from "../hooks/useAppTheme";

type EmptyStateAnimationProps = {
  icon?: keyof typeof MaterialIcons.glyphMap;
};

export default function EmptyStateAnimation({
  icon = "inventory-2",
}: EmptyStateAnimationProps) {
  const { theme } = useAppTheme();
  const float = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [float, pulse]);

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }, { scale: pulse.value }],
  }));

  return (
    <View style={styles.wrap}>
      <View style={[styles.glow, { backgroundColor: theme.primarySoft }]} />
      <Animated.View style={[styles.bubble, { backgroundColor: theme.surface }, bubbleStyle]}>
        <MaterialIcons name={icon} size={36} color={theme.primary} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  glow: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    opacity: 0.5,
  },
  bubble: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
