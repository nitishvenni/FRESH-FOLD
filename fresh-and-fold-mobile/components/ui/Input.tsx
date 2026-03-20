import { ReactNode } from "react";
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { colors, radius, shadow, spacing, typography } from "../../theme/theme";

type InputProps = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
  leading?: ReactNode;
};

export default function Input({
  containerStyle,
  leading,
  style,
  placeholderTextColor = "#9CA3AF",
  ...props
}: InputProps) {
  return (
    <View style={[styles.wrapper, containerStyle]}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <TextInput
        {...props}
        placeholderTextColor={placeholderTextColor}
        style={[styles.input, style]}
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
