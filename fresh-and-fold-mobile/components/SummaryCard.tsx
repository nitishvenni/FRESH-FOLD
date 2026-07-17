import { ReactNode } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

type SummaryCardProps = {
  title: string;
  children: ReactNode;
  headerRight?: ReactNode;
  style?: ViewStyle;
};

export default function SummaryCard({ title, children, headerRight, style }: SummaryCardProps) {
  const { theme, isDark } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? "rgba(17,24,39,0.4)" : "rgba(255,255,255,0.7)",
          borderColor: isDark ? "rgba(148,163,184,0.15)" : "rgba(255,255,255,0.9)",
          borderWidth: 1,
        },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {headerRight}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});
