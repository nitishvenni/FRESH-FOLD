import { useMemo, useRef, useState } from "react";
import { NativeSyntheticEvent, StyleSheet, TextInput, TextInputKeyPressEventData, View } from "react-native";
import { radius, shadow, spacing, typography } from "../../theme/theme";
import { useAppTheme } from "../../hooks/useAppTheme";

type OTPInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
};

export default function OTPInput({
  value,
  onChange,
  length = 6,
  autoFocus = true,
}: OTPInputProps) {
  const { theme } = useAppTheme();
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const digits = useMemo(
    () => Array.from({ length }, (_, index) => value[index] ?? ""),
    [length, value]
  );

  const focusInput = (index: number) => {
    inputRefs.current[index]?.focus();
  };

  const updateValueAtIndex = (text: string, index: number) => {
    const sanitized = text.replace(/\D/g, "");
    if (!sanitized && text) {
      return;
    }

    if (sanitized.length > 1) {
      const nextDigits = [...digits];
      let nextIndex = index;

      for (const char of sanitized) {
        if (nextIndex >= length) {
          break;
        }
        nextDigits[nextIndex] = char;
        nextIndex += 1;
      }

      const nextValue = nextDigits.join("").slice(0, length);
      onChange(nextValue);

      const targetIndex = Math.min(nextValue.length, length - 1);
      focusInput(targetIndex);
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = sanitized;
    onChange(nextDigits.join(""));

    if (sanitized && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyPress = (
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (event.nativeEvent.key !== "Backspace") {
      return;
    }

    if (digits[index]) {
      return;
    }

    if (index > 0) {
      focusInput(index - 1);
    }
  };

  return (
    <View style={styles.container}>
      {digits.map((digit, index) => {
        const isFocused = focusedIndex === index;
        const isFilled = Boolean(digit);

        return (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            value={digit}
            onChangeText={(text) => updateValueAtIndex(text, index)}
            onKeyPress={(event) => handleKeyPress(event, index)}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(-1)}
            autoFocus={autoFocus && index === 0}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            importantForAutofill="yes"
            maxLength={length}
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.surface,
                borderColor: isFocused
                  ? theme.primary
                  : isFilled
                    ? theme.primarySoft
                    : theme.border,
              },
              isFocused && {
                backgroundColor: theme.surfaceAlt,
              },
            ]}
            selectionColor={theme.primary}
            returnKeyType="done"
            textAlign="center"
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  input: {
    width: 44,
    height: 56,
    borderWidth: 1.5,
    borderRadius: radius.md,
    fontSize: 22,
    fontFamily: typography.semibold,
    ...shadow,
  },
});
