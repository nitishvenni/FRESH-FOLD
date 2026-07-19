import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useAppTheme } from "../../hooks/useAppTheme";

type HomeAiActionCardsProps = {
  onSmartScanPress: () => void;
  onVoiceBookingPress: () => void;
};

type AiActionCardProps = {
  icon: "document-scanner" | "mic-none";
  title: string;
  subtitle: string;
  accessibilityLabel: string;
  onPress: () => void;
  accent: "scan" | "voice";
};

function AiActionCard({ icon, title, subtitle, accessibilityLabel, onPress, accent }: AiActionCardProps) {
  const { theme, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const isScan = accent === "scan";
  const start = isScan ? theme.smartScanGradientStart : theme.primary;
  const end = isScan ? theme.smartScanGradientEnd : isDark ? "#234B8F" : "#5B8DEF";

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.card, { borderColor: isScan ? theme.smartScanBorder : theme.border }]}
    >
      <BlurView intensity={isDark ? 22 : 32} tint={isDark ? "dark" : "light"} style={styles.fill} />
      <LinearGradient colors={[start, end]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} />
      <View style={[styles.icon, { backgroundColor: isScan ? theme.smartScanIconBg : "rgba(255,255,255,0.16)", borderColor: isScan ? theme.smartScanIconBorder : "rgba(255,255,255,0.28)" }]}>
        <MaterialIcons name={icon} size={compact ? 20 : 22} color={isScan ? theme.smartScanIconColor : "#FFFFFF"} />
      </View>
      <Text numberOfLines={1} style={[styles.title, { color: isScan ? theme.smartScanTitle : "#FFFFFF", fontSize: compact ? 14 : 15 }]}>{title}</Text>
      <Text numberOfLines={2} style={[styles.subtitle, { color: isScan ? theme.smartScanSubtitle : "rgba(255,255,255,0.84)", fontSize: compact ? 10.5 : 11 }]}>{subtitle}</Text>
      <View style={[styles.arrow, { backgroundColor: isScan ? theme.smartScanArrowBg : "rgba(255,255,255,0.18)" }]}>
        <MaterialIcons name="arrow-forward" size={compact ? 16 : 18} color={isScan ? theme.smartScanArrowColor : "#FFFFFF"} />
      </View>
    </TouchableOpacity>
  );
}

/** Two focused AI entry points. Quick Actions remain intentionally separate. */
export default function HomeAiActionCards({ onSmartScanPress, onVoiceBookingPress }: HomeAiActionCardsProps) {
  return (
    <View style={styles.row}>
      <AiActionCard
        accent="scan"
        icon="document-scanner"
        title="Smart Scan"
        subtitle="Analyze your clothes"
        accessibilityLabel="Smart Scan"
        onPress={onSmartScanPress}
      />
      <AiActionCard
        accent="voice"
        icon="mic-none"
        title="Voice Booking"
        subtitle="Book with your voice"
        accessibilityLabel="Voice Booking"
        onPress={onVoiceBookingPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  card: {
    flex: 1,
    minHeight: 132,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    padding: 12,
    ...Platform.select({
      ios: { shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 },
    }),
  },
  fill: { ...StyleSheet.absoluteFillObject },
  icon: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { marginTop: 12, fontWeight: "700" },
  subtitle: { marginTop: 4, lineHeight: 15 },
  arrow: { position: "absolute", right: 10, bottom: 10, width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
});
