import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../hooks/useAppTheme";
import { registerForPushNotificationsAsync } from "../utils/registerForPushNotifications";
import { apiRequest } from "../utils/api";
import { handleError } from "../utils/errorHandler";

export default function OTPScreen() {
  const router = useRouter();
  const { mobile } = useLocalSearchParams();
  const { login } = useAuth();
  const { theme } = useAppTheme();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyOtp = async () => {
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Enter OTP</Text>

      <TextInput
        placeholder="Enter 6-digit OTP"
        placeholderTextColor="#9CA3AF"
        keyboardType="number-pad"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
        style={[styles.input, { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }]}
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }, loading && styles.buttonDisabled]}
        onPress={verifyOtp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Verify</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 6,
    marginBottom: 16,
    fontSize: 16,
    textAlign: "center",
  },
  button: {
    padding: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
