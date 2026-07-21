import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { apiRequest } from "../utils/api";
import { handleError } from "../utils/errorHandler";
import { useAppTheme } from "../hooks/useAppTheme";
import { showToast } from "../utils/toast";
import AICareLogo from "../components/AICareLogo";

export default function LoginScreen() {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (mobile.length !== 10) {
      showToast({
        type: "error",
        title: "Invalid number",
        message: "Please enter a valid 10-digit mobile number.",
      });
      return;
    }

    try {
      setLoading(true);
      await apiRequest<{ success: boolean }>("/auth/send-otp", {
        method: "POST",
        body: { mobile },
      });

      router.push({
        pathname: "/otp",
        params: { mobile },
      });
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const glassBg = isDark ? "rgba(30, 41, 59, 0.5)" : "rgba(255, 255, 255, 0.7)";
  const glassBorder = isDark ? "rgba(148, 163, 184, 0.15)" : "rgba(148, 163, 184, 0.2)";
  const inputBg = isDark ? "rgba(15, 23, 42, 0.5)" : "rgba(255, 255, 255, 0.5)";
  const inputBorder = isDark ? "rgba(148, 163, 184, 0.2)" : "rgba(148, 163, 184, 0.3)";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Premium Atmospheric Background */}
      <View style={[styles.backgroundGlowTop, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(219, 234, 254, 0.6)" }]} />
      <View style={[styles.backgroundGlowBottom, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.08)" : "rgba(219, 234, 254, 0.4)" }]} />
      <View style={[styles.backgroundGlowMiddle, { backgroundColor: isDark ? "rgba(147, 197, 253, 0.05)" : "rgba(191, 219, 254, 0.5)" }]} />

      <View style={styles.content}>
        <View style={styles.logoWrap}>
          {/* AI Care Logo in Premium Container */}
          <View style={[styles.logoBadge, { backgroundColor: isDark ? theme.surfaceElevated : "rgba(255, 255, 255, 0.8)", borderColor: glassBorder }]}>
            <AICareLogo size={68} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Fresh & Fold</Text>
          <Text style={[styles.subtitle, { color: theme.primary }]}>Premium Laundry Care</Text>
        </View>

        {/* Login Glass Card */}
        <View style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder, shadowColor: theme.shadow }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Welcome back</Text>
          <Text style={[styles.cardCopy, { color: theme.textMuted }]}>
            Sign in with your mobile number to schedule pickups, track orders, and
            manage deliveries.
          </Text>

          {/* Phone Number Input */}
          <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor: inputBorder }]}>
            <MaterialIcons name="phone-iphone" size={20} color={theme.textMuted} />
            <Text style={[styles.countryCode, { color: theme.text }]}>+91</Text>
            <View style={[styles.inputDivider, { backgroundColor: inputBorder }]} />
            <TextInput
              placeholder="Enter phone number"
              placeholderTextColor={theme.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
              value={mobile}
              onChangeText={(value) => setMobile(value.replace(/\D/g, "").slice(0, 10))}
              style={[styles.input, { color: theme.text }]}
              editable={!loading}
            />
          </View>

          {/* Primary CTA */}
          <TouchableOpacity
            style={[styles.buttonWrapper, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.9}
          >
            <View style={[styles.button, { backgroundColor: theme.primary }]}>
              {loading ? (
                <Text style={styles.buttonText}>Sending OTP...</Text>
              ) : (
                <>
                  <Text style={styles.buttonText}>Send OTP</Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Non-interactive Terms & Privacy */}
          <Text style={[styles.footer, { color: theme.textMuted }]}>
            By continuing you agree to our Terms & Privacy Policy
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
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
  content: {
    paddingHorizontal: 24,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoBadge: {
    width: 82,
    height: 82,
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
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  cardCopy: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 26,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 60,
    borderRadius: 18,
    marginBottom: 24,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
    marginRight: 12,
  },
  inputDivider: {
    width: 1,
    height: 24,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
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
  footer: {
    marginTop: 22,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.8,
  },
});
