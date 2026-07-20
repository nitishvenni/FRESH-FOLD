import { useCallback, useEffect } from "react";
import {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type TactilePressOptions = {
  pressedScale?: number;
};

/**
 * A short, UI-thread press response shared by Home controls. It intentionally
 * has no timers, loops, or layout animation and honors the system motion setting.
 */
export function useTactilePress({ pressedScale = 0.98 }: TactilePressOptions = {}) {
  const reducedMotion = useReducedMotion();
  const pressProgress = useSharedValue(0);

  useEffect(() => () => cancelAnimation(pressProgress), [pressProgress]);

  const onPressIn = useCallback(() => {
    if (!reducedMotion) {
      pressProgress.value = withTiming(1, { duration: 100, reduceMotion: ReduceMotion.System });
    }
  }, [pressProgress, reducedMotion]);

  const onPressOut = useCallback(() => {
    if (!reducedMotion) {
      pressProgress.value = withTiming(0, { duration: 140, reduceMotion: ReduceMotion.System });
    }
  }, [pressProgress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - pressedScale) * pressProgress.value }],
  }));

  return { animatedStyle, onPressIn, onPressOut, pressProgress };
}
