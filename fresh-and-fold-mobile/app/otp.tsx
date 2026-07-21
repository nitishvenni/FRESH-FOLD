import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../hooks/useAppTheme";
import { registerForPushNotificationsAsync } from "../utils/registerForPushNotifications";
import { apiRequest } from "../utils/api";
import { handleError } from "../utils/errorHandler";
import OTPInput from "../components/ui/OTPInput";
import AICareLogo from "../components/AICareLogo";

export default function OTPScreen() {
  const { mobile } = useLocalSearchParams();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, isDark } = useAppTheme();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const mobileText = String(mobile || "");

  const formatMaskedMobile = (number: string) => {
    if (number.length !== 10) return number;
    return `${number.substring(0, 5)} ${number.substring(5)}`;
  };

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

  const glassBg = isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(255, 255, 255, 0.7)";
  const glassBorder = isDark ? "rgba(148, 163, 184, 0.15)" : "rgba(148, 163, 184, 0.2)";
  const noticeBg = isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Premium Atmospheric Background matching Login */}
      <View style={[styles.backgroundGlowTop, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(219, 234, 254, 0.6)" }]} />
      <View style={[styles.backgroundGlowBottom, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.08)" : "rgba(219, 234, 254, 0.4)" }]} />
      <View style={[styles.backgroundGlowMiddle, { backgroundColor: isDark ? "rgba(147, 197, 253, 0.05)" : "rgba(191, 219, 254, 0.5)" }]} />

      {/* Back Button */}
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 8, backgroundColor: isDark ? "rgba(30, 41, 59, 0.6)" : "rgba(255, 255, 255, 0.8)", borderColor: glassBorder }]}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back to Login"
      >
        <MaterialIcons name="arrow-back" size={22} color={theme.text} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoWrap}>
          {/* Large AI Care Logo */}
          <View style={[styles.logoBadge, { backgroundColor: isDark ? theme.surfaceElevated : "rgba(255, 255, 255, 0.8)", borderColor: glassBorder }]}>
            <AICareLogo size={80} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Fresh & Fold</Text>
          <Text style={[styles.subtitle, { color: theme.primary }]}>Premium Laundry Care</Text>
        </View>

        <View style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder, shadowColor: theme.shadow }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="verified-user" size={22} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Enter OTP</Text>
          </View>
          <Text style={[styles.cardCopy, { color: theme.textMuted }]}>
            We have sent a 6-digit OTP to
          </Text>

          <View style={styles.mobileRow}>
            <Text style={[styles.mobileNumber, { color: theme.text }]}>+91 {formatMaskedMobile(mobileText)}</Text>
            <TouchableOpacity onPress={() => router.back()} style={[styles.editButton, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(219, 234, 254, 0.6)" }]}>
              <Text style={[styles.editText, { color: theme.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.otpWrap}>
            <OTPInput value={otp} onChange={setOtp} />
          </View>

          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            The code should arrive in a few seconds.
          </Text>

          <View style={[styles.noticeCard, { backgroundColor: noticeBg, borderColor: glassBorder }]}>
            <MaterialIcons name="security" size={16} color={theme.textMuted} />
            <Text style={[styles.noticeText, { color: theme.textMuted }]}>
              For your security, never share your OTP with anyone.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.buttonWrapper, loading && styles.buttonDisabled]}
            onPress={verifyOtp}
            disabled={otp.length !== 6 || loading}
            activeOpacity={0.9}
          >
            <View style={[styles.button, { backgroundColor: theme.primary, opacity: otp.length !== 6 ? 0.6 : 1 }]}>
              {loading ? (
                <Text style={styles.buttonText}>Verifying...</Text>
              ) : (
                <>
                  <Text style={styles.buttonText}>Verify & Continue</Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </View>
          </TouchableOpacity>
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
    top: -80,
    right: -40,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: -120,
    left: -60,
    width: 360,
    height: 360,
    borderRadius: 180,
  },
  backgroundGlowMiddle: {
    position: "absolute",
    top: "30%",
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  backButton: {
    position: "absolute",
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoBadge: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    ...Platform.select({
      ios: {},
      android: { elevation: 0 },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  cardCopy: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 6,
  },
  mobileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  mobileNumber: {
    fontSize: 16,
    fontWeight: "700",
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editText: {
    fontSize: 12,
    fontWeight: "700",
  },
  otpWrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 24,
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginBottom: 24,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  buttonWrapper: {
    borderRadius: 18,
    overflow: "hidden",
  },
  button: {
    height: 58,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
