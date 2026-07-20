import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useAppTheme } from "../../hooks/useAppTheme";
import { homeDesign } from "../../theme/theme";
import { useTactilePress } from "../../hooks/useTactilePress";

type HomeAiActionCardsProps = {
  onSmartScanPress: () => void;
  onVoiceBookingPress: () => void;
};

type AiActionCardProps = {
  icon: "document-scanner" | "mic-none";
  title: string;
  subtitle: string;
  accessibilityLabel: string;
  accessibilityHint: string;
  onPress: () => void;
  accent: "scan" | "voice";
};

function AiActionCard({ icon, title, subtitle, accessibilityLabel, accessibilityHint, onPress, accent }: AiActionCardProps) {
  const { theme, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const isScan = accent === "scan";
  const { animatedStyle, onPressIn, onPressOut, pressProgress } = useTactilePress({ pressedScale: 0.98 });
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pressProgress.value * 3 }],
  }));

  return (
    <Animated.View style={[styles.cardWrapper, animatedStyle]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        activeOpacity={0.94}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        style={[
          styles.card,
          {
            backgroundColor: isScan ? theme.smartScanBg : theme.primary,
            borderColor: isScan ? theme.smartScanBorder : "rgba(255,255,255,0.34)",
          },
        ]}
      >
        {!isScan ? (
          <LinearGradient
            pointerEvents="none"
            colors={isDark ? ["#4F8CFF", "#214A91"] : ["#2563EB", "#4F8CFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fill}
          />
        ) : null}
        <View style={[styles.icon, { backgroundColor: isScan ? theme.smartScanIconBg : "rgba(255,255,255,0.16)", borderColor: isScan ? theme.smartScanIconBorder : "rgba(255,255,255,0.28)" }]}>
          <MaterialIcons name={icon} size={compact ? 19 : 21} color={isScan ? theme.smartScanIconColor : "#FFFFFF"} />
        </View>
        <Text maxFontSizeMultiplier={1.15} numberOfLines={1} style={[styles.title, { color: isScan ? theme.smartScanTitle : "#FFFFFF", fontSize: compact ? 15 : 16.5 }]}>{title}</Text>
        <Text maxFontSizeMultiplier={1.2} numberOfLines={2} style={[styles.subtitle, { color: isScan ? theme.smartScanSubtitle : "rgba(255,255,255,0.84)", fontSize: compact ? 10.5 : 11.5 }]}>{subtitle}</Text>
        <Animated.View style={[styles.arrow, arrowStyle, { backgroundColor: isScan ? theme.smartScanArrowBg : "rgba(255,255,255,0.18)" }]}>
          <MaterialIcons name="arrow-forward" size={compact ? 16 : 18} color={isScan ? theme.smartScanArrowColor : "#FFFFFF"} />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function HomeAiActionCards({ onSmartScanPress, onVoiceBookingPress }: HomeAiActionCardsProps) {
  return (
    <View style={styles.row}>
      <AiActionCard
        accent="scan"
        icon="document-scanner"
        title="Smart Scan"
        subtitle="Analyze your clothes"
        accessibilityLabel="Smart Scan"
        accessibilityHint="Opens garment scanning in AI Care."
        onPress={onSmartScanPress}
      />
      <AiActionCard
        accent="voice"
        icon="mic-none"
        title="Voice Booking"
        subtitle="Book with your voice"
        accessibilityLabel="Voice Booking"
        accessibilityHint="Opens voice-assisted booking."
        onPress={onVoiceBookingPress}
      />
    </View>
  );
}

export default memo(HomeAiActionCards);

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, marginTop: 14 },
  cardWrapper: { flex: 1 },
  card: {
    flex: 1,
    minHeight: 120,
    borderRadius: homeDesign.actionRadius,
    borderWidth: 1,
    overflow: "hidden",
    padding: 12,
    ...Platform.select({
      ios: { shadowColor: "#0F172A", shadowOpacity: 0.045, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 1 },
    }),
  },
  fill: { ...StyleSheet.absoluteFillObject },
  icon: { width: 38, height: 38, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { marginTop: 10, fontWeight: "700", letterSpacing: -0.3 },
  subtitle: { maxWidth: "76%", marginTop: 3, lineHeight: 15 },
  arrow: { position: "absolute", right: 12, bottom: 12, width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
});
