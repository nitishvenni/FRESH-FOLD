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
  background: colors.background,
  surface: colors.card,
  surfaceAlt: "#EFF6FF",
  text: colors.textPrimary,
  textMuted: colors.textSecondary,
  border: colors.border,
  primary: colors.primary,
  secondary: colors.secondary,
  primarySoft: "#DBEAFE",
  success: colors.success,
  danger: colors.danger,
  shadow: "#0F172A",
  tabBar: "rgba(255,255,255,0.96)",
  glass: colors.glass,
};

export const darkTheme = {
  background: "#0F172A",
  surface: "#1E293B",
  surfaceAlt: "#172554",
  text: "#F8FAFC",
  textMuted: "#CBD5E1",
  border: "#334155",
  primary: "#60A5FA",
  secondary: "#38BDF8",
  primarySoft: "#1E3A8A",
  success: "#4ADE80",
  danger: "#F87171",
  shadow: "#020617",
  tabBar: "rgba(15,23,42,0.96)",
  glass: "rgba(30,41,59,0.72)",
};

export type AppTheme = typeof lightTheme;
