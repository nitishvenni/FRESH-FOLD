import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Image, Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useAppTheme } from "../../hooks/useAppTheme";
import HomeHeader from "./HomeHeader";

type HomeHeroProps = {
  firstName: string;
  onNotificationsPress: () => void;
};

const lightHero = require("../../assets/images/home/laundry-hero-light.png");
const darkHero = require("../../assets/images/home/laundry-hero-dark.png");

export default function HomeHero({ firstName, onNotificationsPress }: HomeHeroProps) {
  const { theme, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  // Artwork dimensions — image is absolute, content flows naturally
  const artworkHeight = Math.round(width * 0.92);
  const artworkWidth = Math.round(width * (isDark ? 0.84 : 0.88));

  // Gradient masks to blend the hero image into the page background
  const bgColor = isDark ? "11,15,22" : "246,249,255";
  const horizontalBlend = [
    `rgba(${bgColor},1)`,
    `rgba(${bgColor},0.90)`,
    `rgba(${bgColor},0.32)`,
    `rgba(${bgColor},0)`,
  ] as const;
  const verticalBlend = [
    `rgba(${bgColor},0)`,
    `rgba(${bgColor},0.04)`,
    `rgba(${bgColor},0.82)`,
  ] as const;
  const bottomBlend = [
    `rgba(${bgColor},0)`,
    `rgba(${bgColor},0)`,
    `rgba(${bgColor},0.42)`,
    `rgba(${bgColor},0.99)`,
  ] as const;

  return (
    <View style={styles.heroContainer}>
      {/* ABSOLUTE: Hero photography + gradient masks */}
      <View pointerEvents="none" style={styles.artworkLayer}>
        <Image
          source={isDark ? darkHero : lightHero}
          resizeMode="cover"
          style={[
            styles.heroImage,
            {
              width: artworkWidth,
              height: artworkHeight,
              top: isDark ? -36 : -44,
              right: isDark ? -32 : -38,
            },
          ]}
        />
        <LinearGradient colors={horizontalBlend} locations={[0, 0.40, 0.70, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientMask} />
        <LinearGradient colors={verticalBlend} locations={[0, 0.60, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.gradientMask} />
        <LinearGradient colors={bottomBlend} locations={[0, 0.50, 0.85, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.gradientMask} />
      </View>

      {/* FLOW LAYOUT: All text content stacks naturally — NO overlap possible */}

      {/* 1. Header row (menu, notification, AI buttons + greeting) */}
      <View style={styles.flowContent}>
        <HomeHeader
          firstName={firstName}
          onNotificationsPress={onNotificationsPress}
        />
      </View>

      {/* 2. AI Care Mode pill */}
      <View style={styles.flowContent}>
        <View style={[styles.statusChip, { backgroundColor: theme.glass, borderColor: theme.border }]}>
          <BlurView intensity={isDark ? 18 : 28} tint={isDark ? "dark" : "light"} style={styles.blurFill} />
          <MaterialIcons name="verified-user" size={16} color={theme.primary} />
          <Text style={[styles.statusText, { color: theme.text }]}>AI Care Mode</Text>
          <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
          <Text style={[styles.statusMeta, { color: theme.textMuted }]}>Active</Text>
        </View>
      </View>

      {/* 3. Headline */}
      <View style={styles.flowContent}>
        <Text style={[styles.title, { color: theme.text }]}>
          Laundry,{"\n"}
          <Text style={{ color: theme.primary }}>reimagined.</Text>
        </Text>
        <Text style={[styles.description, { color: theme.textMuted }]}>
          Smart care for every fabric.{"\n"}Cleaner results, every time.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    position: "relative",
    // No fixed height — content flows naturally, artwork sits behind
  },
  artworkLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  heroImage: {
    position: "absolute",
  },
  gradientMask: {
    ...StyleSheet.absoluteFillObject,
  },
  flowContent: {
    zIndex: 1,
  },
  // AI Care Mode pill
  statusChip: {
    alignSelf: "flex-start",
    height: 34,
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    marginTop: 20,
  },
  statusText: {
    marginLeft: 6,
    fontSize: 11.5,
    fontWeight: "600",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 10,
  },
  statusMeta: {
    marginLeft: 5,
    fontSize: 11,
  },
  // Headline
  title: {
    marginTop: 12,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "700",
    letterSpacing: -0.9,
  },
  description: {
    marginTop: 6,
    fontSize: 14.5,
    lineHeight: 19,
    maxWidth: "70%",
  },
  scanButton: {
    height: 60,
    marginTop: 12,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 }
    })
  },
  scanGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  scanIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanCopy: {
    flex: 1,
    marginLeft: 10,
  },
  scanTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  scanSubtitle: {
    marginTop: 2,
    fontSize: 11,
  },
  arrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  blurFill: {
    ...StyleSheet.absoluteFillObject,
  },
});
