import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { radius, shadows, spacing, typography } from "../theme/theme";

type ProfileOptionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

export default function ProfileOption({
  icon,
  label,
  onPress,
  destructive = false,
}: ProfileOptionProps) {
  const { theme, isDark } = useAppTheme();
  const iconColor = destructive ? theme.danger : theme.primary;
  const textColor = destructive ? theme.danger : theme.text;
  const iconBackground = destructive
    ? isDark
      ? "rgba(248, 113, 113, 0.16)"
      : "#FEE2E2"
    : theme.primarySoft;

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
      activeOpacity={0.88}
      onPress={onPress}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    ...shadows.card,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: typography.medium,
  },
});
