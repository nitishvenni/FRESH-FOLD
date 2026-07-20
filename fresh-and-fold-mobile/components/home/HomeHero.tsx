import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { Image, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useAppTheme } from "../../hooks/useAppTheme";
import HomeHeader from "./HomeHeader";

type HomeHeroProps = {
  firstName: string;
  onNotificationsPress: () => void;
};

const lightHero = require("../../assets/images/home/laundry-hero-light-20260721.png");
const darkHero = require("../../assets/images/home/laundry-hero-dark-20260721.png");

function HomeHero({ firstName, onNotificationsPress }: HomeHeroProps) {
  const { theme, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const wide = width >= 430;
  const headlineSize = compact ? 36 : wide ? 42 : 40;
  const headlineLineHeight = compact ? 40 : wide ? 46 : 44;
  const heroMinHeight = compact ? 310 : wide ? 360 : 334;
  const artworkHeight = heroMinHeight;
  const artworkWidth = Math.round(artworkHeight * (isDark ? 1194 / 1317 : 1208 / 1302));
  const artworkRight = Math.round(width * 0.035) - 33;
  const background = isDark ? "11,15,22" : "246,249,255";

  return (
    <View style={[styles.heroContainer, { minHeight: heroMinHeight }]}>
      <View pointerEvents="none" style={styles.artworkLayer}>
        <Image
          accessible={false}
          importantForAccessibility="no"
          source={isDark ? darkHero : lightHero}
          resizeMode="cover"
          fadeDuration={0}
          style={[styles.heroImage, { width: artworkWidth, height: artworkHeight, right: artworkRight, opacity: isDark ? 0.92 : 0.94 }]}
        />
        <LinearGradient
          colors={[
            `rgba(${background},0.99)`,
            `rgba(${background},0.98)`,
            `rgba(${background},0.86)`,
            `rgba(${background},0.50)`,
            `rgba(${background},0.06)`,
          ]}
          locations={[0, 0.32, 0.5, 0.7, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradientMask}
        />
      </View>

      <View style={styles.flowContent}>
        <HomeHeader firstName={firstName} onNotificationsPress={onNotificationsPress} />
      </View>
      <View style={styles.flowContent}>
        <View
          accessible
          accessibilityLabel="AI Care Mode active"
          style={[styles.statusChip, { backgroundColor: isDark ? "rgba(17,29,46,0.80)" : "rgba(255,255,255,0.74)", borderColor: theme.homeFeaturedBorder }]}
        >
          <View style={[styles.statusIcon, { backgroundColor: theme.primarySoft }]}>
            <MaterialIcons name="verified-user" size={15} color={theme.primary} />
          </View>
          <Text maxFontSizeMultiplier={1.2} style={[styles.statusText, { color: theme.text }]}>AI Care Mode</Text>
          <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
          <Text maxFontSizeMultiplier={1.2} style={[styles.statusMeta, { color: theme.textMuted }]}>Active</Text>
        </View>
      </View>
      <View style={styles.flowContent}>
        <Text maxFontSizeMultiplier={1.2} style={[styles.title, { color: theme.text, fontSize: headlineSize, lineHeight: headlineLineHeight }]}>
          Laundry,{"\n"}<Text style={{ color: theme.primary }}>reimagined.</Text>
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.description, { color: theme.textMuted, fontSize: compact ? 15 : 16, lineHeight: compact ? 20 : 22, maxWidth: compact ? "76%" : "68%" }]}>
          Smart care for every fabric.{"\n"}Cleaner results, every time.
        </Text>
      </View>
    </View>
  );
}

export default memo(HomeHero);

const styles = StyleSheet.create({
  heroContainer: { position: "relative", paddingBottom: 10 },
  artworkLayer: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  heroImage: { position: "absolute", top: 0 },
  gradientMask: { ...StyleSheet.absoluteFillObject },
  flowContent: { zIndex: 1 },
  statusChip: {
    alignSelf: "flex-start",
    height: 34,
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },
  statusIcon: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  statusText: { marginLeft: 7, fontSize: 12, fontWeight: "600" },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 10 },
  statusMeta: { marginLeft: 5, fontSize: 11.5 },
  title: { marginTop: 12, fontWeight: "700", letterSpacing: -1 },
  description: { marginTop: 6, letterSpacing: -0.1 },
});
