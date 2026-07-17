import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

type OrderSkeletonProps = {
  count?: number;
  compact?: boolean;
};

export default function OrderSkeleton({
  count = 3,
  compact = false,
}: OrderSkeletonProps) {
  const { isDark } = useAppTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  const blockColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  return (
    <View style={compact ? undefined : styles.container}>
      <Animated.View style={{ opacity }}>
        {Array.from({ length: count }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.block,
              { backgroundColor: blockColor },
              compact && { height: 112 },
              !compact && { height: 104 },
              compact && index === count - 1 ? { marginBottom: 0 } : { marginBottom: 16 },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 80,
  },
  block: {
    width: "100%",
    borderRadius: 16,
  },
});
