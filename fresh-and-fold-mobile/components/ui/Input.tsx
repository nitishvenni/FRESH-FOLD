import { ReactNode } from "react";
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { useAppTheme } from "../../hooks/useAppTheme";
import { colors, radius, shadow, spacing, typography } from "../../theme/theme";

type InputProps = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
  leading?: ReactNode;
  variant?: "default" | "glass";
};

export default function Input({
  containerStyle,
  leading,
  style,
  placeholderTextColor,
  variant = "default",
  ...props
}: InputProps) {
  const { theme, isDark } = useAppTheme();

  const isGlass = variant === "glass";
  
  const defaultPlaceholderColor = isGlass ? theme.textMuted : "#9CA3AF";
  const finalPlaceholderColor = placeholderTextColor || defaultPlaceholderColor;

  return (
    <View
      style={[
        styles.wrapper,
        isGlass && {
          backgroundColor: isDark ? "rgba(17,24,39,0.4)" : "rgba(255,255,255,0.7)",
          borderColor: isDark ? "rgba(148,163,184,0.15)" : "rgba(255,255,255,0.9)",
          elevation: 0,
          shadowOpacity: 0,
        },
        containerStyle,
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <TextInput
        {...props}
        placeholderTextColor={finalPlaceholderColor}
        style={[styles.input, isGlass && { color: theme.text }, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    ...shadow,
  },
  leading: {
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 10,
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: typography.body,
  },
});
