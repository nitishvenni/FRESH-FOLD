import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { memo, type ReactNode, useCallback } from "react";
import { Image, ScrollView, StyleProp, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AICareLogo from "../components/AICareLogo";
import { APP_TAB_BAR_CONTENT_INSET } from "../components/AppTabBar";
import { useAppTheme } from "../hooks/useAppTheme";
import { useTactilePress } from "../hooks/useTactilePress";
import { homeDesign } from "../theme/theme";
import { AI_CARE_ACTIONS } from "../utils/aiCareActions";

const lightHero = require("../assets/images/home/ai-care-hero-light.jpg");
const darkHero = require("../assets/images/home/ai-care-hero-dark.jpg");
const smartScanRoute = AI_CARE_ACTIONS.find((action) => action.key === "smart_scan")?.route ?? "/smart-scan";

const heroGradientColors = {
  light: ["rgba(246,249,255,0.99)", "rgba(246,249,255,0.94)", "rgba(246,249,255,0.58)", "rgba(246,249,255,0.05)"],
  dark: ["rgba(11,15,22,0.99)", "rgba(11,15,22,0.94)", "rgba(11,15,22,0.58)", "rgba(11,15,22,0.05)"],
} as const;

const featuredGlassWashColors = {
  light: ["rgba(255,255,255,0.18)", "rgba(187,213,250,0.05)", "rgba(255,255,255,0.02)"],
  dark: ["rgba(122,164,224,0.14)", "rgba(24,53,95,0.04)", "rgba(171,205,252,0.05)"],
} as const;

type ToolTone = "primary" | "success" | "accent" | "warning";

type Tool = {
  key: (typeof AI_CARE_ACTIONS)[number]["key"];
  title: string;
  copy: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  tone: ToolTone;
};

const tools: Tool[] = [
  {
    key: "smart_scan",
    title: "Garment Recognition",
    copy: "Identify garment type and relevant care information.",
    icon: "checkroom",
    tone: "primary",
  },
  {
    key: "stain_detection",
    title: "Stain Detection",
    copy: "Analyze possible stains and get careful guidance.",
    icon: "search",
    tone: "success",
  },
  {
    key: "fabric_identification",
    title: "Fabric Identification",
    copy: "Identify likely fabric and advisory care needs.",
    icon: "texture",
    tone: "accent",
  },
  {
    key: "care_label_reader",
    title: "Care Label Reader",
    copy: "Read care labels while keeping the physical label authoritative.",
    icon: "local-laundry-service",
    tone: "warning",
  },
];

function TactileAction({
  children,
  onPress,
  style,
  wrapperStyle,
  accessibilityLabel,
  accessibilityHint,
}: {
  children: ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  wrapperStyle?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  accessibilityHint: string;
}) {
  const { animatedStyle, onPressIn, onPressOut } = useTactilePress({ pressedScale: 0.985 });

  return (
    <Animated.View style={[animatedStyle, wrapperStyle]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        activeOpacity={0.94}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

const ToolCard = memo(function ToolCard({ tool, compact, onPress }: { tool: Tool; compact: boolean; onPress: (key: Tool["key"]) => void }) {
  const { theme } = useAppTheme();
  const palette = {
    primary: { color: theme.primary, surface: theme.primarySoft },
    success: { color: theme.success, surface: theme.successSoft },
    accent: { color: theme.accent, surface: theme.accentSoft },
    warning: { color: theme.warning, surface: theme.surfaceAlt },
  }[tool.tone];

  return (
    <TactileAction
      accessibilityLabel={tool.title}
      accessibilityHint={`Opens ${tool.title}.`}
      onPress={() => onPress(tool.key)}
      wrapperStyle={compact ? styles.toolCardCompact : styles.toolCardTwoColumn}
      style={[
        styles.toolCard,
        { backgroundColor: theme.aiCareCardGlass, borderColor: theme.aiCareGlassBorder },
      ]}
    >
      <View pointerEvents="none" style={[styles.glassHighlight, { backgroundColor: theme.aiCareGlassHighlight }]} />
      <View style={[styles.toolIcon, { backgroundColor: palette.surface, borderColor: theme.homeBorder }]}>
        <MaterialIcons name={tool.icon} size={24} color={palette.color} />
      </View>
      <Text maxFontSizeMultiplier={1.2} style={[styles.toolTitle, { color: theme.text }]}>{tool.title}</Text>
      <Text maxFontSizeMultiplier={1.3} style={[styles.toolCopy, { color: theme.textMuted }]}>{tool.copy}</Text>
      <View style={[styles.toolArrow, { backgroundColor: theme.surfaceAlt }]}>
        <MaterialIcons name="arrow-forward" size={18} color={palette.color} />
      </View>
    </TactileAction>
  );
});

export default function AICareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { theme, isDark } = useAppTheme();
  const compact = width < 360;
  const heroTitleSize = compact ? 32 : width >= 430 ? 40 : 36;
  const heroTitleLineHeight = compact ? 38 : width >= 430 ? 46 : 42;
  const heroArtworkHeight = compact ? 250 : width >= 430 ? 276 : 258;
  const heroArtworkWidth = Math.round(heroArtworkHeight * (isDark ? 760 / 838 : 760 / 819));
  const heroArtworkRight = Math.round(width * 0.02) - 18;

  const openTool = useCallback((key: Tool["key"]) => {
    const route = AI_CARE_ACTIONS.find((action) => action.key === key)?.route;
    if (route) router.push(route as never);
  }, [router]);

  const openSmartScan = useCallback(() => router.push(smartScanRoute as never), [router]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 10,
            paddingBottom: insets.bottom + APP_TAB_BAR_CONTENT_INSET + 20,
          },
        ]}
      >
        <View style={[styles.hero, { backgroundColor: theme.aiCareHeroGlass, borderColor: theme.aiCareGlassBorder }]}>
          <View pointerEvents="none" style={styles.heroArtworkLayer}>
            <Image
              accessible={false}
              importantForAccessibility="no"
              source={isDark ? darkHero : lightHero}
              resizeMode="cover"
              resizeMethod="resize"
              fadeDuration={0}
              style={[styles.heroArtwork, { width: heroArtworkWidth, height: heroArtworkHeight, right: heroArtworkRight, opacity: isDark ? 0.9 : 0.88 }]}
            />
            <LinearGradient
              colors={isDark ? heroGradientColors.dark : heroGradientColors.light}
              locations={[0, 0.42, 0.7, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.heroGradient}
            />
          </View>
          <View accessible accessibilityLabel="AI Care Mode active" style={[styles.statusChip, { backgroundColor: isDark ? "rgba(17,29,46,0.82)" : "rgba(255,255,255,0.82)", borderColor: theme.homeFeaturedBorder }]}>
            <MaterialIcons name="auto-awesome" size={15} color={theme.primary} />
            <Text maxFontSizeMultiplier={1.2} style={[styles.statusLabel, { color: theme.text }]}>AI Care Mode</Text>
            <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
            <Text maxFontSizeMultiplier={1.2} style={[styles.statusActive, { color: theme.success }]}>Active</Text>
          </View>
          <Text maxFontSizeMultiplier={1.15} style={[styles.heroTitle, { color: theme.text, fontSize: heroTitleSize, lineHeight: heroTitleLineHeight, maxWidth: compact ? "76%" : "70%" }]}>
            Smart care,{"\n"}<Text style={{ color: theme.primary }}>powered by AI.</Text>
          </Text>
          <Text maxFontSizeMultiplier={1.25} style={[styles.heroCopy, { color: theme.textMuted, maxWidth: compact ? "78%" : "66%" }]}>
            Advanced AI analysis for every fabric, stain and care label.
          </Text>
        </View>

        <Text maxFontSizeMultiplier={1.2} style={[styles.sectionEyebrow, { color: theme.textMuted }]}>YOUR AI ASSISTANT</Text>
        <TactileAction
          accessibilityLabel="Start Smart Scan"
          accessibilityHint="Opens garment scanning and analysis."
          onPress={openSmartScan}
          style={[styles.featuredCard, { backgroundColor: theme.aiCareFeaturedGlass, borderColor: theme.aiCareGlassBorder }]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={isDark ? featuredGlassWashColors.dark : featuredGlassWashColors.light}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View pointerEvents="none" style={[styles.glassHighlight, { backgroundColor: theme.aiCareGlassHighlight }]} />
          <View style={[styles.featuredLogo, { backgroundColor: isDark ? theme.aiBubbleBg : theme.surfaceElevated, borderColor: isDark ? theme.aiBubbleBorder : theme.homeFeaturedBorder }]}>
            <AICareLogo size={compact ? 68 : 78} />
          </View>
          <View style={styles.featuredCopy}>
            <View style={styles.recommendedRow}>
              <MaterialIcons name="auto-awesome" size={15} color={theme.recommendationEyebrow} />
              <Text maxFontSizeMultiplier={1.2} style={[styles.recommendedLabel, { color: theme.recommendationEyebrow }]}>RECOMMENDED</Text>
            </View>
            <View style={styles.featuredTitleRow}>
              <Text maxFontSizeMultiplier={1.2} style={[styles.featuredTitle, { color: theme.recommendationTitle }]}>Smart Scan</Text>
              <View style={[styles.aiBadge, { backgroundColor: theme.primary }]}><Text style={styles.aiBadgeText}>AI</Text></View>
            </View>
            <Text maxFontSizeMultiplier={1.25} style={[styles.featuredDescription, { color: theme.recommendationReason }]}>
              Scan a garment for comprehensive, reviewable AI analysis.
            </Text>
          </View>
          <View style={[styles.featuredCta, { backgroundColor: theme.recommendationActionBg }]}>
            <MaterialIcons name="document-scanner" size={19} color={theme.recommendationActionText} />
            <Text maxFontSizeMultiplier={1.15} style={[styles.featuredCtaText, { color: theme.recommendationActionText }]}>Start Smart Scan</Text>
            <MaterialIcons name="arrow-forward" size={19} color={theme.recommendationActionText} />
          </View>
        </TactileAction>

        <View style={styles.sectionHeader}>
          <View>
            <Text maxFontSizeMultiplier={1.2} style={[styles.sectionTitle, { color: theme.text }]}>Explore AI Care</Text>
            <Text maxFontSizeMultiplier={1.25} style={[styles.sectionSubtitle, { color: theme.textMuted }]}>Choose the help you need.</Text>
          </View>
        </View>
        <View style={styles.toolGrid}>
          {tools.map((tool) => <ToolCard key={tool.key} tool={tool} compact={compact} onPress={openTool} />)}
        </View>

        <View style={[styles.recentCard, { backgroundColor: theme.homeSurfaceElevated, borderColor: theme.aiCareGlassBorder }]}>
          <View style={[styles.recentIcon, { backgroundColor: theme.primarySoft }]}>
            <MaterialIcons name="history" size={21} color={theme.primary} />
          </View>
          <View style={styles.recentCopyWrap}>
            <Text maxFontSizeMultiplier={1.2} style={[styles.recentTitle, { color: theme.text }]}>Recent Analyses</Text>
            <Text maxFontSizeMultiplier={1.3} style={[styles.recentCopy, { color: theme.textMuted }]}>Your recent AI analyses will appear here.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16 },
  hero: { position: "relative", overflow: "hidden", minHeight: 242, borderRadius: homeDesign.cardRadius, borderWidth: 1, padding: 18 },
  heroArtworkLayer: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  heroArtwork: { position: "absolute", top: 0 },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  statusChip: { alignSelf: "flex-start", minHeight: 32, borderRadius: 16, borderWidth: 1, paddingHorizontal: 10, flexDirection: "row", alignItems: "center" },
  statusLabel: { marginLeft: 6, fontSize: 12, fontWeight: "700" },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginLeft: 10 },
  statusActive: { marginLeft: 5, fontSize: 12, fontWeight: "700" },
  heroTitle: { marginTop: 18, fontWeight: "700", letterSpacing: -1.1 },
  heroCopy: { marginTop: 8, fontSize: 16, lineHeight: 23, letterSpacing: -0.15 },
  sectionEyebrow: { marginTop: 22, marginLeft: 2, fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  featuredCard: { minHeight: 238, marginTop: 8, borderRadius: homeDesign.cardRadius, borderWidth: 1, padding: 16, overflow: "hidden" },
  featuredLogo: { width: 94, height: 94, borderRadius: 47, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  featuredCopy: { marginTop: 12 },
  recommendedRow: { flexDirection: "row", alignItems: "center" },
  recommendedLabel: { marginLeft: 5, fontSize: 10, fontWeight: "700", letterSpacing: 0.7 },
  featuredTitleRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  featuredTitle: { fontSize: 25, lineHeight: 31, fontWeight: "700", letterSpacing: -0.55 },
  aiBadge: { minHeight: 25, minWidth: 31, borderRadius: 13, alignItems: "center", justifyContent: "center", marginLeft: 9, paddingHorizontal: 8 },
  aiBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  featuredDescription: { marginTop: 5, maxWidth: "92%", fontSize: 14, lineHeight: 20 },
  featuredCta: { position: "absolute", left: 16, right: 16, bottom: 16, minHeight: 46, borderRadius: 23, paddingHorizontal: 15, flexDirection: "row", alignItems: "center" },
  featuredCtaText: { flex: 1, marginLeft: 9, fontSize: 14, fontWeight: "700" },
  sectionHeader: { marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 21, lineHeight: 26, fontWeight: "700", letterSpacing: -0.45 },
  sectionSubtitle: { marginTop: 3, fontSize: 13, lineHeight: 18 },
  toolGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  toolCard: { position: "relative", minHeight: 202, overflow: "hidden", borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 14, justifyContent: "flex-start" },
  toolCardTwoColumn: { width: "48.2%" },
  toolCardCompact: { width: "100%", minHeight: 172 },
  toolIcon: { width: 46, height: 46, borderRadius: homeDesign.iconRadius, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  toolTitle: { marginTop: 12, fontSize: 15, lineHeight: 19, fontWeight: "700", letterSpacing: -0.25 },
  toolCopy: { marginTop: 5, paddingRight: 4, fontSize: 12, lineHeight: 17 },
  toolArrow: { position: "absolute", right: 13, bottom: 13, width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  glassHighlight: { position: "absolute", top: 0, left: 16, right: 16, height: 1, borderRadius: 1 },
  recentCard: { minHeight: 92, marginTop: 16, borderRadius: homeDesign.actionRadius, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center" },
  recentIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 12 },
  recentCopyWrap: { flex: 1 },
  recentTitle: { fontSize: 16, lineHeight: 20, fontWeight: "700" },
  recentCopy: { marginTop: 3, fontSize: 12.5, lineHeight: 18 },
});
