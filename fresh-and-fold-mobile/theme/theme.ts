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
  tabBar: "rgba(255,255,255,0.78)",
  glass: "rgba(255,255,255,0.68)",
  heroOverlay: "rgba(246,249,255,0.5)",

  // Smart Scan — light frosted glass
  smartScanBg: "rgba(255,255,255,0.72)",
  smartScanGradientStart: "rgba(255,255,255,0.82)",
  smartScanGradientEnd: "rgba(235,242,255,0.60)",
  smartScanBorder: "rgba(255,255,255,0.90)",
  smartScanTitle: "#0F1D34",
  smartScanSubtitle: "rgba(71,85,105,0.82)",
  smartScanIconBg: "rgba(37,99,235,0.10)",
  smartScanIconBorder: "rgba(37,99,235,0.22)",
  smartScanIconColor: "#2563EB",
  smartScanArrowBg: "rgba(255,255,255,0.92)",
  smartScanArrowColor: "#0F1D34",

  // AI Recommendation — light frosted glass
  recommendationBg: "rgba(235,242,255,0.70)",
  recommendationGradientStart: "rgba(255,255,255,0.78)",
  recommendationGradientEnd: "rgba(219,234,254,0.52)",
  recommendationBorder: "rgba(147,197,253,0.40)",
  recommendationEyebrow: "rgba(37,99,235,0.72)",
  recommendationTitle: "#0F1D34",
  recommendationAccent: "#2563EB",
  recommendationReason: "rgba(71,85,105,0.84)",
  recommendationDemoLabel: "rgba(100,116,139,0.72)",
  recommendationActionBg: "#FFFFFF",
  recommendationActionText: "#0F1D34",
  recommendationSectionIconBg: "rgba(37,99,235,0.10)",
  recommendationSectionIconColor: "#4F8CFF",

  // AI Care bubble — luminous light glass
  aiBubbleBg: "rgba(255,255,255,0.82)",
  aiBubbleBorder: "rgba(219,234,254,0.80)",
  aiBubbleGlow: "rgba(37,99,235,0.12)",

  // Header glass buttons
  headerButtonBg: "rgba(255,255,255,0.72)",
  headerButtonBorder: "rgba(255,255,255,0.90)",
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
  tabBar: "rgba(17,24,39,0.82)",
  glass: "rgba(17,24,39,0.7)",
  heroOverlay: "rgba(11,15,22,0.58)",

  // Smart Scan — dark translucent glass
  smartScanBg: "rgba(11,18,31,0.88)",
  smartScanGradientStart: "rgba(15,23,42,0.92)",
  smartScanGradientEnd: "rgba(11,18,31,0.78)",
  smartScanBorder: "rgba(148,163,184,0.28)",
  smartScanTitle: "#E5E7EB",
  smartScanSubtitle: "#9CA3AF",
  smartScanIconBg: "rgba(37,99,235,0.20)",
  smartScanIconBorder: "rgba(129,162,255,0.26)",
  smartScanIconColor: "#8AB2FF",
  smartScanArrowBg: "rgba(79,140,255,0.22)",
  smartScanArrowColor: "#9DBBFF",

  // AI Recommendation — dark translucent glass
  recommendationBg: "rgba(16,40,77,0.80)",
  recommendationGradientStart: "rgba(16,40,77,0.92)",
  recommendationGradientEnd: "rgba(7,19,33,0.88)",
  recommendationBorder: "rgba(123,163,225,0.30)",
  recommendationEyebrow: "#9CA3AF",
  recommendationTitle: "#E5E7EB",
  recommendationAccent: "#4F8CFF",
  recommendationReason: "#9CA3AF",
  recommendationDemoLabel: "#6B7280",
  recommendationActionBg: "#F8FAFC",
  recommendationActionText: "#10203A",
  recommendationSectionIconBg: "rgba(93,143,255,0.16)",
  recommendationSectionIconColor: "#9FBEFF",

  // AI Care bubble — dark translucent glass
  aiBubbleBg: "rgba(20,28,42,0.90)",
  aiBubbleBorder: "rgba(148,163,184,0.28)",
  aiBubbleGlow: "rgba(79,140,255,0.14)",

  // Header glass buttons
  headerButtonBg: "rgba(17,24,39,0.70)",
  headerButtonBorder: "rgba(148,163,184,0.28)",
};

export type AppTheme = typeof lightTheme;
