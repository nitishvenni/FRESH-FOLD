export const colors = {
  primary: "#2563EB",
  secondary: "#0EA5E9",
  background: "#F8FAFC",
  card: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  success: "#22C55E",
  danger: "#EF4444",
  glass: "rgba(255,255,255,0.7)",
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  pill: 999,
} as const;

/** Static visual primitives shared by the performance-safe Home design. */
export const homeDesign = {
  actionRadius: 24,
  cardRadius: 26,
  floatingRadius: 28,
  iconRadius: 16,
  sectionGap: 14,
} as const;

export const typography = {
  body: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const shadows = {
  card: {
    shadowColor: "#000000",
    shadowOpacity: 0.035,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  floating: {
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export const shadow = shadows.card;

export const lightTheme = {
  background: "#F6F9FF",
  surface: colors.card,
  surfaceAlt: "#E8F0FF",
  surfaceElevated: "#FFFFFF",
  text: colors.textPrimary,
  textMuted: colors.textSecondary,
  border: colors.border,
  primary: colors.primary,
  accent: "#7C3AED",
  secondary: colors.secondary,
  primarySoft: "#DBEAFE",
  accentSoft: "#EDE9FE",
  success: colors.success,
  successSoft: "#DCFCE7",
  warning: "#F59E0B",
  danger: colors.danger,
  shadow: "#0F172A",
  tabBar: "rgba(255,255,255,0.94)",
  glass: "rgba(255,255,255,0.68)",
  heroOverlay: "rgba(246,249,255,0.5)",
  homeSurface: "#FBFCFF",
  homeSurfaceElevated: "#FFFFFF",
  homeSurfaceTint: "#F4F8FD",
  homeBorder: "#DCE6F2",
  homeFeaturedBorder: "#D0DDEC",

  // Smart Scan — light frosted glass
  smartScanBg: "#FCFDFF",
  smartScanGradientStart: "rgba(255,255,255,0.82)",
  smartScanGradientEnd: "rgba(235,242,255,0.60)",
  smartScanBorder: "#D2DFEF",
  smartScanTitle: "#0F1D34",
  smartScanSubtitle: "rgba(71,85,105,0.82)",
  smartScanIconBg: "rgba(37,99,235,0.10)",
  smartScanIconBorder: "rgba(37,99,235,0.22)",
  smartScanIconColor: "#2563EB",
  smartScanArrowBg: "#EEF4FF",
  smartScanArrowColor: "#2563EB",

  // AI Recommendation — light frosted glass
  recommendationBg: "#12213A",
  recommendationGradientStart: "#12213A",
  recommendationGradientEnd: "#12213A",
  recommendationBorder: "#294261",
  recommendationEyebrow: "#9DBBFF",
  recommendationTitle: "#F8FAFC",
  recommendationAccent: "#2563EB",
  recommendationReason: "#C5D0E0",
  recommendationDemoLabel: "#9EACC0",
  recommendationActionBg: "#FFFFFF",
  recommendationActionText: "#0F1D34",
  recommendationSectionIconBg: "#1D3761",
  recommendationSectionIconColor: "#A9C4FF",

  // AI Care bubble — luminous light glass
  aiBubbleBg: "#FFFFFF",
  aiBubbleBorder: "#D7E3F5",
  aiBubbleGlow: "rgba(37,99,235,0.12)",

  // AI Care â€” restrained optical-glass hierarchy
  aiCareHeroGlass: "rgba(248,251,255,0.76)",
  aiCareFeaturedGlass: "rgba(18,45,91,0.82)",
  aiCareCardGlass: "rgba(255,255,255,0.76)",
  aiCareGlassBorder: "rgba(205,220,240,0.88)",
  aiCareGlassHighlight: "rgba(255,255,255,0.86)",

  // Header glass buttons
  headerButtonBg: "rgba(255,255,255,0.78)",
  headerButtonBorder: "rgba(215,227,245,0.92)",
};

export const darkTheme = {
  background: "#0B0F16",
  surface: "#111827",
  surfaceAlt: "#172033",
  surfaceElevated: "#151F2E",
  text: "#E5E7EB",
  textMuted: "#9CA3AF",
  border: "#263244",
  primary: "#4F8CFF",
  accent: "#8B5CF6",
  secondary: "#66B8FF",
  primarySoft: "#13264A",
  accentSoft: "#2B1C4B",
  success: "#22C55E",
  successSoft: "#143824",
  warning: "#FBBF24",
  danger: "#F87171",
  shadow: "#020617",
  tabBar: "rgba(13,20,31,0.96)",
  glass: "rgba(17,24,39,0.7)",
  heroOverlay: "rgba(11,15,22,0.58)",
  homeSurface: "#111B29",
  homeSurfaceElevated: "#162235",
  homeSurfaceTint: "#142033",
  homeBorder: "#2A3A50",
  homeFeaturedBorder: "#354963",

  // Smart Scan — dark translucent glass
  smartScanBg: "#131E2D",
  smartScanGradientStart: "rgba(15,23,42,0.92)",
  smartScanGradientEnd: "rgba(11,18,31,0.78)",
  smartScanBorder: "#304258",
  smartScanTitle: "#E5E7EB",
  smartScanSubtitle: "#9CA3AF",
  smartScanIconBg: "rgba(37,99,235,0.20)",
  smartScanIconBorder: "rgba(129,162,255,0.26)",
  smartScanIconColor: "#8AB2FF",
  smartScanArrowBg: "#1A3157",
  smartScanArrowColor: "#9DBBFF",

  // AI Recommendation — dark translucent glass
  recommendationBg: "#101B2D",
  recommendationGradientStart: "#101B2D",
  recommendationGradientEnd: "#101B2D",
  recommendationBorder: "#29415F",
  recommendationEyebrow: "#9DBBFF",
  recommendationTitle: "#F8FAFC",
  recommendationAccent: "#4F8CFF",
  recommendationReason: "#C1CCDC",
  recommendationDemoLabel: "#94A4B9",
  recommendationActionBg: "#F8FAFC",
  recommendationActionText: "#10203A",
  recommendationSectionIconBg: "#1B345A",
  recommendationSectionIconColor: "#A9C4FF",

  // AI Care bubble — dark translucent glass
  aiBubbleBg: "#151F2E",
  aiBubbleBorder: "#334155",
  aiBubbleGlow: "rgba(79,140,255,0.14)",

  // AI Care â€” restrained optical-glass hierarchy
  aiCareHeroGlass: "rgba(15,25,40,0.74)",
  aiCareFeaturedGlass: "rgba(8,18,32,0.80)",
  aiCareCardGlass: "rgba(18,30,47,0.76)",
  aiCareGlassBorder: "rgba(102,137,184,0.30)",
  aiCareGlassHighlight: "rgba(173,204,250,0.18)",

  // Header glass buttons
  headerButtonBg: "rgba(21,31,46,0.88)",
  headerButtonBorder: "rgba(71,85,105,0.72)",
};

export type AppTheme = typeof lightTheme;
