import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../hooks/useAppTheme";
import { registerForPushNotificationsAsync } from "../utils/registerForPushNotifications";
import { apiRequest } from "../utils/api";
import { handleError } from "../utils/errorHandler";
import Button from "../components/ui/Button";
import OTPInput from "../components/ui/OTPInput";
import { radius, shadow, spacing, typography } from "../theme/theme";

export default function OTPScreen() {
  const router = useRouter();
  const { mobile } = useLocalSearchParams();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const mobileText = String(mobile || "");

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      handleError(new Error("Please enter the 6-digit OTP"));
      return;
    }

    try {
      setLoading(true);
      const data = await apiRequest<{ success: boolean; token: string }>(
        "/auth/verify-otp",
        {
          method: "POST",
          body: {
            mobile: String(mobile),
            otp,
          },
        }
      );

      const normalizedToken = String(data.token || "")
        .replace(/^(\s*Bearer\s+)+/i, "")
        .trim();
      await AsyncStorage.setItem("token", normalizedToken);
      await AsyncStorage.setItem("mobile", String(mobile || ""));

      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          await apiRequest("/user/save-push-token", {
            method: "POST",
            token: normalizedToken,
            body: { pushToken },
          });
        }
      } catch (error) {
        console.warn("Push notification setup failed:", error);
      }

      await login();
      router.replace("/home");
    } catch (error) {
      if (error instanceof Error && error.message === "Invalid OTP") {
        handleError(error);
      } else {
        console.warn("OTP verification failed:", error);
        handleError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View
        style={[
          styles.backgroundGlowTop,
          { backgroundColor: theme.primarySoft, opacity: isDark ? 0.22 : 0.75 },
        ]}
      />
      <View
        style={[
          styles.backgroundGlowBottom,
          { backgroundColor: theme.primarySoft, opacity: isDark ? 0.16 : 0.4 },
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <View style={[styles.badge, { backgroundColor: theme.primarySoft }]}>
            <Text style={[styles.badgeText, { color: theme.primary }]}>Secure verification</Text>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Verify your number</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Enter the 6-digit code sent to
          </Text>
          <Text style={[styles.mobileText, { color: theme.text }]}>{mobileText}</Text>

          <View style={styles.otpWrap}>
            <OTPInput value={otp} onChange={setOtp} />
          </View>

          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            The code should arrive in a few seconds.
          </Text>

          <Button
            title="Verify OTP"
            onPress={verifyOtp}
            loading={loading}
            disabled={otp.length !== 6}
            style={[styles.button, { backgroundColor: theme.primary }]}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -88,
    right: -44,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: -36,
    left: -84,
    width: 210,
    height: 210,
    borderRadius: 105,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.md,
    ...shadow,
  },
  badge: {
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: 13,
    fontFamily: typography.semibold,
  },
  title: {
    fontSize: 32,
    fontFamily: typography.bold,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    fontFamily: typography.body,
  },
  mobileText: {
    fontSize: 20,
    textAlign: "center",
    fontFamily: typography.semibold,
    marginTop: -4,
  },
  otpWrap: {
    alignItems: "center",
    marginTop: spacing.xs,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: typography.body,
  },
  button: {
    marginTop: spacing.sm,
  },
});
