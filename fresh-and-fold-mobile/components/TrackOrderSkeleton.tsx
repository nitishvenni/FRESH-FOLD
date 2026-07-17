import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

export default function TrackOrderSkeleton() {
  const { theme, isDark } = useAppTheme();
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View style={{ opacity }}>
        <View style={[styles.title, { backgroundColor: blockColor }]} />
        <View style={[styles.subtitle, { backgroundColor: blockColor }]} />
        
        {Array.from({ length: 7 }).map((_, index) => (
          <View key={index} style={styles.row}>
            <View style={[styles.circle, { backgroundColor: blockColor }]} />
            <View style={[styles.line, { backgroundColor: blockColor }]} />
          </View>
        ))}

        <View style={[styles.button, { backgroundColor: blockColor }]} />
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
  title: {
    width: 160,
    height: 26,
    borderRadius: 8,
  },
  subtitle: {
    width: 120,
    height: 16,
    borderRadius: 6,
    marginTop: 14,
    marginBottom: 32,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  circle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  line: {
    width: 180,
    height: 16,
    borderRadius: 6,
  },
  button: {
    width: "100%",
    height: 48,
    borderRadius: 10,
    marginTop: 32,
  },
});
