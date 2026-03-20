import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeOutUp,
  Layout,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../hooks/useAppTheme";
import { radius, shadows, spacing, typography } from "../theme/theme";
import { subscribeToToast, type ToastPayload } from "../utils/toast";

type ActiveToast = Required<ToastPayload>;

export default function ToastHost() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  useEffect(() => {
    return subscribeToToast((toast) => {
      setToasts((prev) => [...prev.slice(-2), toast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
      }, toast.duration);
    });
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { top: insets.top + spacing.sm }]}
    >
      {toasts.map((toast) => {
        const accentColor =
          toast.type === "success"
            ? theme.success
            : toast.type === "error"
              ? theme.danger
              : theme.primary;

        return (
          <Animated.View
            key={toast.id}
            entering={FadeInDown.duration(220)}
            exiting={FadeOutUp.duration(180)}
            layout={Layout.springify().damping(16)}
            style={[
              styles.toast,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                shadowColor: theme.shadow,
              },
            ]}
          >
            <View style={[styles.accent, { backgroundColor: accentColor }]} />
            <View style={styles.textWrap}>
              <Text style={[styles.title, { color: theme.text }]}>
                {toast.title}
              </Text>
              {toast.message ? (
                <Text style={[styles.message, { color: theme.textMuted }]}>
                  {toast.message}
                </Text>
              ) : null}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
    gap: spacing.sm,
  },
  toast: {
    minHeight: 64,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    ...shadows.floating,
  },
  accent: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: radius.pill,
    marginRight: spacing.sm + 2,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: typography.semibold,
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: typography.body,
  },
});
