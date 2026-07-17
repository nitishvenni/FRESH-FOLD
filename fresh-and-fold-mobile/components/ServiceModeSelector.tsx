import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useAppTheme } from "../hooks/useAppTheme";
import { triggerSelectionHaptic } from "../utils/haptics";

type ServiceSpeed = "standard" | "express";

type ServiceModeSelectorProps = {
  selected: ServiceSpeed;
  onChange: (speed: ServiceSpeed) => void;
};

export default function ServiceModeSelector({ selected, onChange }: ServiceModeSelectorProps) {
  const { theme, isDark } = useAppTheme();
  const isExpress = selected === "express";

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      left: withSpring(isExpress ? "50%" : "0%", {
        mass: 0.6,
        damping: 16,
        stiffness: 150,
      }),
    };
  });

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.track,
          {
            backgroundColor: isDark ? "rgba(17,24,39,0.5)" : "rgba(235,242,255,0.4)",
            borderColor: isDark ? "rgba(148,163,184,0.15)" : "rgba(255,255,255,0.6)",
          },
        ]}
      >
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: isDark ? "rgba(30,41,59,0.9)" : "#FFFFFF",
              borderColor: isDark ? "rgba(79,140,255,0.3)" : "rgba(255,255,255,0.8)",
              shadowColor: isDark ? "#000000" : "rgba(37,99,235,0.15)",
            },
            indicatorStyle,
          ]}
        />
        
        <TouchableOpacity
          style={styles.segment}
          activeOpacity={1}
          onPress={() => {
            if (isExpress) {
              void triggerSelectionHaptic();
              onChange("standard");
            }
          }}
        >
          <Text
            style={[
              styles.label,
              {
                color: !isExpress ? theme.primary : theme.textMuted,
                fontWeight: !isExpress ? "700" : "500",
              },
            ]}
          >
            Standard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.segment}
          activeOpacity={1}
          onPress={() => {
            if (!isExpress) {
              void triggerSelectionHaptic();
              onChange("express");
            }
          }}
        >
          <Text
            style={[
              styles.label,
              {
                color: isExpress ? theme.primary : theme.textMuted,
                fontWeight: isExpress ? "700" : "500",
              },
            ]}
          >
            Express
          </Text>
        </TouchableOpacity>
      </View>
      {isExpress ? (
        <Animated.Text entering={FadeIn.duration(200)} style={[styles.helper, { color: theme.primary }]}>
          Priority cleaning with faster turnaround
        </Animated.Text>
      ) : (
        <View style={{ height: 21 }} /> // Spacer to avoid layout shift
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  track: {
    flexDirection: "row",
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    padding: 3,
    position: "relative",
    marginBottom: 6,
  },
  indicator: {
    position: "absolute",
    top: 3,
    bottom: 3,
    width: "50%",
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  label: {
    fontSize: 14.5,
  },
  helper: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    height: 21,
  },
});
