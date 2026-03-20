import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "../components/Card";
import { useAppTheme } from "../hooks/useAppTheme";
import { radius, spacing, typography } from "../theme/theme";
import { triggerImpactHaptic } from "../utils/haptics";
import { showToast } from "../utils/toast";

const PROFILE_NAME_KEY = "profileName";
const PROFILE_MOBILE_KEY = "mobile";
const ADDRESSES_CACHE_KEY = "addressesCache";

type AddressCacheItem = {
  fullName?: string;
  phone?: string;
};

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [storedName, storedMobile, cachedAddresses] = await Promise.all([
        AsyncStorage.getItem(PROFILE_NAME_KEY),
        AsyncStorage.getItem(PROFILE_MOBILE_KEY),
        AsyncStorage.getItem(ADDRESSES_CACHE_KEY),
      ]);

      if (storedName?.trim()) {
        setName(storedName.trim());
      }

      if (storedMobile?.trim()) {
        setPhone(storedMobile.startsWith("+91") ? storedMobile : `+91 ${storedMobile}`);
      }

      if ((!storedName || !storedName.trim()) && cachedAddresses) {
        const parsed = JSON.parse(cachedAddresses) as AddressCacheItem[];
        const primary = parsed.find((item) => item.fullName?.trim() || item.phone?.trim());
        if (primary?.fullName?.trim()) {
          setName(primary.fullName.trim());
        }
        if ((!storedMobile || !storedMobile.trim()) && primary?.phone?.trim()) {
          setPhone(primary.phone.startsWith("+91") ? primary.phone : `+91 ${primary.phone}`);
        }
      }
    } catch {
      // Keep empty fallback state.
    }
  };

  const saveProfile = async () => {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedPhone) {
      showToast({
        type: "error",
        title: "Missing details",
        message: "Please enter both your name and phone number.",
      });
      return;
    }

    try {
      setSaving(true);
      const normalizedPhone = trimmedPhone.startsWith("+91") ? trimmedPhone : `+91 ${trimmedPhone}`;
      await AsyncStorage.multiSet([
        [PROFILE_NAME_KEY, trimmedName],
        [PROFILE_MOBILE_KEY, normalizedPhone],
      ]);
      void triggerImpactHaptic();
      showToast({
        type: "success",
        title: "Profile updated",
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + spacing.md,
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.xl,
          }}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backRow}
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={theme.text} />
            <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: theme.text }]}>Edit Profile</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Update your name and mobile number for a more personalized Fresh & Fold experience.
          </Text>

          <Card style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.text }]}>Name</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[styles.label, { color: theme.text }]}>Phone</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
              ]}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 9876543210"
              placeholderTextColor={theme.textMuted}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }, saving && styles.disabledButton]}
              activeOpacity={0.9}
              onPress={() => {
                void saveProfile();
              }}
              disabled={saving}
            >
              <Text style={styles.buttonText}>{saving ? "Saving..." : "Save Changes"}</Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  backText: {
    marginLeft: 8,
    fontSize: 15,
    fontFamily: typography.semibold,
  },
  title: {
    fontSize: 28,
    fontFamily: typography.bold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: typography.body,
    marginBottom: spacing.lg,
  },
  formCard: {
    padding: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontFamily: typography.semibold,
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    fontFamily: typography.body,
    marginBottom: spacing.lg,
  },
  button: {
    height: 54,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: typography.semibold,
  },
});
