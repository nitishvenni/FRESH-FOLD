import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, radius, shadows, spacing, typography } from "../theme/theme";

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
  const iconColor = destructive ? colors.danger : colors.primary;
  const textColor = destructive ? colors.danger : colors.textPrimary;

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.88} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: destructive ? "#FEE2E2" : "#EFF6FF" }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
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
