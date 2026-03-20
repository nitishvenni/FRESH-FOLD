import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { APP_TAB_BAR_HEIGHT } from "../components/AppTabBar";
import Card from "../components/Card";
import ProfileOption from "../components/ProfileOption";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../hooks/useAppTheme";
import { spacing, typography } from "../theme/theme";
import { triggerImpactHaptic, triggerSelectionHaptic } from "../utils/haptics";

const ADDRESSES_CACHE_KEY = "addressesCache";
const PROFILE_NAME_KEY = "profileName";
const PROFILE_MOBILE_KEY = "mobile";

type AddressCacheItem = {
  _id?: string;
  fullName?: string;
  phone?: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { theme, preference, setPreference } = useAppTheme();
  const [displayName, setDisplayName] = useState("Fresh & Fold Member");
  const [mobile, setMobile] = useState("+91");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const darkModeEnabled = preference === "dark";

  useFocusEffect(
    useCallback(() => {
      void loadProfileState();
    }, [])
  );

  const loadProfileState = async () => {
    try {
      const [storedMobile, storedName, cachedAddresses, storedNotifications] = await Promise.all([
        AsyncStorage.getItem(PROFILE_MOBILE_KEY),
        AsyncStorage.getItem(PROFILE_NAME_KEY),
        AsyncStorage.getItem(ADDRESSES_CACHE_KEY),
        AsyncStorage.getItem("notificationsEnabled"),
      ]);

      if (storedMobile) {
        const normalized = storedMobile.startsWith("+91") ? storedMobile : `+91 ${storedMobile}`;
        setMobile(normalized);
      } else {
        setMobile("+91");
      }

      if (storedNotifications === "false") {
        setNotificationsEnabled(false);
      } else {
        setNotificationsEnabled(true);
      }

      if (typeof storedName === "string" && storedName.trim()) {
        setDisplayName(storedName.trim());
        return;
      }

      if (cachedAddresses) {
        const parsed = JSON.parse(cachedAddresses) as AddressCacheItem[];
        const primary = parsed.find((item) => item.fullName?.trim());
        if (primary?.fullName) {
          setDisplayName(primary.fullName);
          if (!storedMobile && primary.phone) {
            setMobile(primary.phone.startsWith("+91") ? primary.phone : `+91 ${primary.phone}`);
          }
          return;
        }
      }

      setDisplayName("Fresh & Fold Member");
    } catch {
      setDisplayName("Fresh & Fold Member");
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    void triggerSelectionHaptic();
    await AsyncStorage.setItem("notificationsEnabled", String(value));
  };

  const handleToggleDarkMode = async (value: boolean) => {
    void triggerSelectionHaptic();
    await setPreference(value ? "dark" : "light");
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingBottom: APP_TAB_BAR_HEIGHT + insets.bottom + 34,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: theme.text }]}>Profile</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Manage your account, delivery preferences, and support options.
        </Text>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            void triggerImpactHaptic();
            router.push("/edit-profile");
          }}
        >
          <Card style={[styles.userCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.userRow}>
              <View style={[styles.avatarWrap, { backgroundColor: theme.primarySoft }]}>
                <Ionicons name="person" size={26} color={theme.primary} />
              </View>
              <View style={styles.userMeta}>
                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={[styles.phone, { color: theme.textMuted }]}>{mobile}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </View>
          </Card>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>

        <ProfileOption
          icon="receipt-outline"
          label="My Orders"
          onPress={() => {
            void triggerImpactHaptic();
            router.push("/order-history");
          }}
        />

        <ProfileOption
          icon="location-outline"
          label="Saved Addresses"
          onPress={() => {
            void triggerImpactHaptic();
            router.push("/select-address");
          }}
        />

        <ProfileOption
          icon="chatbubble-outline"
          label="Support"
          onPress={() => {
            void triggerImpactHaptic();
            router.push("/support");
          }}
        />

        <Card style={[styles.notificationCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.notificationRow}>
            <View style={styles.notificationInfo}>
              <Text style={[styles.notificationTitle, { color: theme.text }]}>Notifications</Text>
              <Text style={[styles.notificationCopy, { color: theme.textMuted }]}>
                Receive order updates and pickup reminders.
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={(value) => {
                void handleToggleNotifications(value);
              }}
              trackColor={{ false: "#D1D5DB", true: theme.primarySoft }}
              thumbColor={notificationsEnabled ? theme.primary : "#F9FAFB"}
            />
          </View>
        </Card>

        <Card style={[styles.notificationCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.notificationRow}>
            <View style={styles.notificationInfo}>
              <Text style={[styles.notificationTitle, { color: theme.text }]}>Dark Mode</Text>
              <Text style={[styles.notificationCopy, { color: theme.textMuted }]}>
                Switch the app between light and dark appearance.
              </Text>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={(value) => {
                void handleToggleDarkMode(value);
              }}
              trackColor={{ false: "#D1D5DB", true: theme.primarySoft }}
              thumbColor={darkModeEnabled ? theme.primary : "#F9FAFB"}
            />
          </View>
        </Card>

        <ProfileOption
          icon="log-out-outline"
          label="Logout"
          destructive
          onPress={() => {
            Alert.alert("Logout", "Do you want to sign out of Fresh & Fold?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Logout",
                style: "destructive",
                onPress: () => {
                  void triggerImpactHaptic();
                  void logout();
                  router.replace("/login");
                },
              },
            ]);
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
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
  userCard: {
    marginBottom: spacing.lg,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  userMeta: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontSize: 20,
    fontFamily: typography.bold,
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    fontFamily: typography.body,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: typography.semibold,
    marginBottom: spacing.sm,
  },
  notificationCard: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationInfo: {
    flex: 1,
    paddingRight: spacing.md,
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: typography.semibold,
    marginBottom: 4,
  },
  notificationCopy: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: typography.body,
  },
});
