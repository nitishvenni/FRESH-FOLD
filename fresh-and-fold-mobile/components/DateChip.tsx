import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

type DateChipProps = {
  month: string;
  date: string;
  day: string;
  selected: boolean;
  onPress: () => void;
};

export default function DateChip({
  month,
  date,
  day,
  selected,
  onPress,
}: DateChipProps) {
  const { theme, isDark } = useAppTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[
        styles.chip,
        {
          backgroundColor: selected
            ? theme.primary
            : isDark
            ? "rgba(17,24,39,0.4)"
            : "rgba(255,255,255,0.7)",
          borderColor: selected
            ? theme.primary
            : isDark
            ? "rgba(148,163,184,0.15)"
            : "rgba(255,255,255,0.9)",
          shadowColor: selected ? theme.primary : "#000",
          shadowOpacity: selected ? (isDark ? 0.3 : 0.2) : 0.02,
        },
      ]}
    >
      <Text style={[styles.month, { color: selected ? "rgba(255,255,255,0.78)" : theme.textMuted }]}>
        {month}
      </Text>
      <Text style={[styles.date, { color: selected ? "#FFFFFF" : theme.text }]}>{date}</Text>
      <Text style={[styles.day, { color: selected ? "rgba(255,255,255,0.86)" : theme.textMuted }]}>
        {day}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    width: 82,
    minHeight: 94,
    paddingVertical: 12,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 0,
  },
  month: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  date: {
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 34,
  },
  day: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
});
