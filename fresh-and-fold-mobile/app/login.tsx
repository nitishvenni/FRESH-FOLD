import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
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

  return (
      <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={[styles.backgroundGlowTop, { backgroundColor: theme.primarySoft, opacity: isDark ? 0.22 : 0.8 }]} />
      <View style={[styles.backgroundGlowBottom, { backgroundColor: theme.primarySoft, opacity: isDark ? 0.18 : 0.65 }]} />

      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <View style={[styles.logoBadge, { backgroundColor: theme.primarySoft, borderColor: theme.border }]}>
            <MaterialIcons name="local-laundry-service" size={28} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Fresh & Fold</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Premium Laundry Care</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Welcome back</Text>
          <Text style={[styles.cardCopy, { color: theme.textMuted }]}>
            Sign in with your mobile number to schedule pickups, track orders, and
            manage deliveries.
          </Text>

          <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MaterialIcons name="phone-iphone" size={20} color={theme.textMuted} />
            <Text style={[styles.countryCode, { color: theme.text }]}>+91</Text>
            <TextInput
              placeholder="Enter phone number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={10}
              value={mobile}
              onChangeText={(value) => setMobile(value.replace(/\D/g, "").slice(0, 10))}
              style={[styles.input, { color: theme.text }]}
            />
          </View>

          <TouchableOpacity
            style={[styles.buttonWrapper, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.9}
          >
            <View style={[styles.button, { backgroundColor: theme.primary }]}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Send OTP</Text>
              )}
            </View>
          </TouchableOpacity>

          <Text style={[styles.footer, { color: theme.textMuted }]}>
            By continuing you agree to our{" "}
            <Text style={[styles.footerLink, { color: theme.primary }]}>Terms & Privacy Policy</Text>
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
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: -120,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  content: {
    paddingHorizontal: 24,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
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
  },
  cardCopy: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 58,
    borderRadius: 18,
    marginBottom: 20,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  buttonWrapper: {
    borderRadius: 18,
    overflow: "hidden",
  },
  button: {
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
  },
  footerLink: {
    fontWeight: "600",
  },
});
