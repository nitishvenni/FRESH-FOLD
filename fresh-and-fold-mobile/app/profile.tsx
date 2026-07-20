import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState, useMemo } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { APP_TAB_BAR_HEIGHT } from "../components/AppTabBar";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../hooks/useAppTheme";
import useOrders from "../hooks/useOrders";
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
  const { theme, isDark, preference, setPreference } = useAppTheme();
  
  const [displayName, setDisplayName] = useState("Fresh & Fold Member");
  const [mobile, setMobile] = useState("+91");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  const darkModeEnabled = preference === "dark";
  const { orders } = useOrders();

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

  const orderStats = useMemo(() => {
    const total = orders.length;
    const completed = orders.filter((o) => (o.status || "").toLowerCase() === "delivered").length;
    const cancelled = orders.filter((o) => (o.status || "").toLowerCase() === "cancelled").length;
    const active = total - completed - cancelled;

    return { total, active, completed, cancelled };
  }, [orders]);

  const glassSurfaceStyle = {
    backgroundColor: isDark ? "rgba(17,24,39,0.5)" : "rgba(255,255,255,0.7)",
    borderColor: isDark ? "rgba(148,163,184,0.15)" : "rgba(255,255,255,0.9)",
  };

  const renderGroupItem = (
    icon: any,
    iconFamily: "MaterialIcons" | "Ionicons" | "Feather",
    title: string,
    subtitle: string,
    onPress: () => void,
    isLast = false
  ) => {
    const IconComponent = 
      iconFamily === "MaterialIcons" ? MaterialIcons : 
      iconFamily === "Feather" ? Feather : Ionicons;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          void triggerImpactHaptic();
          onPress();
        }}
        style={[
          styles.groupItem,
          !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        ]}
      >
        <View style={[styles.groupIconWrap, { backgroundColor: isDark ? "rgba(37,99,235,0.15)" : "#EFF6FF" }]}>
          <IconComponent name={icon as any} size={20} color={theme.primary} />
        </View>
        <View style={styles.groupCopyWrap}>
          <Text style={[styles.groupTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.groupSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Background Glow Atmosphere */}
      <View
        style={[
          styles.backgroundGlowTop,
          { backgroundColor: theme.primarySoft, opacity: isDark ? 0.15 : 0.6 },
        ]}
      />

      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={[styles.header, { color: theme.text }]}>Profile</Text>
          <Text style={[styles.subheader, { color: theme.textMuted }]}>
            Manage your account and preferences
          </Text>
        </View>
        <TouchableOpacity style={styles.headerButton}>
           <Feather name="bell" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: APP_TAB_BAR_HEIGHT + insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)}>
          <View style={[styles.heroCard, glassSurfaceStyle]}>
            <View style={styles.heroContent}>
              <View style={[styles.avatarWrap, { backgroundColor: isDark ? "rgba(37,99,235,0.2)" : "#E0E7FF" }]}>
                <Ionicons name="person" size={32} color={theme.primary} />
              </View>
              <View style={styles.heroMeta}>
                <Text style={[styles.heroName, { color: theme.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
                <View style={styles.heroPhoneRow}>
                  <Feather name="phone" size={12} color={theme.textMuted} />
                  <Text style={[styles.heroPhone, { color: theme.textMuted }]}>{mobile}</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* My Orders Statistics */}
        <Animated.View entering={FadeInDown.delay(150).duration(300)}>
          <View style={styles.sectionHeaderRow}>
             <Text style={[styles.sectionTitle, { color: theme.text }]}>My Orders</Text>
             <TouchableOpacity onPress={() => {
                void triggerImpactHaptic();
                router.push("/order-history");
             }}>
               <Text style={[styles.sectionActionText, { color: theme.textMuted }]}>View All Orders ›</Text>
             </TouchableOpacity>
          </View>
          
          <View style={[styles.statsCard, glassSurfaceStyle]}>
            <View style={styles.statColumn}>
               <View style={[styles.statIconWrap, { backgroundColor: isDark ? "rgba(59,130,246,0.15)" : "#EFF6FF" }]}>
                 <Feather name="shopping-bag" size={16} color={theme.primary} />
               </View>
               <Text style={[styles.statValue, { color: theme.text }]}>{orderStats.total}</Text>
               <Text style={[styles.statLabel, { color: theme.textMuted }]}>Total Orders</Text>
            </View>

            <View style={styles.statColumn}>
               <View style={[styles.statIconWrap, { backgroundColor: isDark ? "rgba(245,158,11,0.15)" : "#FEF3C7" }]}>
                 <Feather name="clock" size={16} color="#D97706" />
               </View>
               <Text style={[styles.statValue, { color: theme.text }]}>{orderStats.active}</Text>
               <Text style={[styles.statLabel, { color: theme.textMuted }]}>Active Orders</Text>
            </View>

            <View style={styles.statColumn}>
               <View style={[styles.statIconWrap, { backgroundColor: isDark ? "rgba(34,197,94,0.15)" : "#DCFCE7" }]}>
                 <Feather name="check-circle" size={16} color="#16A34A" />
               </View>
               <Text style={[styles.statValue, { color: theme.text }]}>{orderStats.completed}</Text>
               <Text style={[styles.statLabel, { color: theme.textMuted }]}>Completed</Text>
            </View>

            {orderStats.cancelled > 0 && (
              <View style={styles.statColumn}>
                 <View style={[styles.statIconWrap, { backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2" }]}>
                   <Feather name="x-circle" size={16} color="#DC2626" />
                 </View>
                 <Text style={[styles.statValue, { color: theme.text }]}>{orderStats.cancelled}</Text>
                 <Text style={[styles.statLabel, { color: theme.textMuted }]}>Cancelled</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Account Section */}
        <Animated.View entering={FadeInUp.delay(200).duration(300)}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 16 }]}>Account</Text>
          <View style={[styles.groupCard, glassSurfaceStyle]}>
            {renderGroupItem(
              "person-outline",
              "Ionicons",
              "Personal Information",
              "Update your name and phone number",
              () => router.push("/edit-profile"),
              false
            )}
            {renderGroupItem(
              "location-outline",
              "Ionicons",
              "Addresses",
              "Manage your saved addresses",
              () => router.push("/select-address"),
              false
            )}
            {renderGroupItem(
              "receipt-outline",
              "Ionicons",
              "Order History",
              "View past and active bookings",
              () => router.push("/order-history"),
              true
            )}
          </View>
        </Animated.View>

        {/* Preferences Section */}
        <Animated.View entering={FadeInUp.delay(250).duration(300)}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 16 }]}>Preferences</Text>
          <View style={[styles.groupCard, glassSurfaceStyle]}>
            <View style={[styles.groupItem, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
               <View style={[styles.groupIconWrap, { backgroundColor: isDark ? "rgba(37,99,235,0.15)" : "#EFF6FF" }]}>
                 <Ionicons name="notifications-outline" size={20} color={theme.primary} />
               </View>
               <View style={styles.groupCopyWrap}>
                 <Text style={[styles.groupTitle, { color: theme.text }]}>Notifications</Text>
                 <Text style={[styles.groupSubtitle, { color: theme.textMuted }]}>Receive order updates and reminders</Text>
               </View>
               <Switch
                 value={notificationsEnabled}
                 onValueChange={(value) => void handleToggleNotifications(value)}
                 trackColor={{ false: "#D1D5DB", true: theme.primarySoft }}
                 thumbColor={notificationsEnabled ? theme.primary : "#F9FAFB"}
               />
            </View>

            <View style={styles.groupItem}>
               <View style={[styles.groupIconWrap, { backgroundColor: isDark ? "rgba(37,99,235,0.15)" : "#EFF6FF" }]}>
                 <Ionicons name="moon-outline" size={20} color={theme.primary} />
               </View>
               <View style={styles.groupCopyWrap}>
                 <Text style={[styles.groupTitle, { color: theme.text }]}>Dark Mode</Text>
                 <Text style={[styles.groupSubtitle, { color: theme.textMuted }]}>Switch between light and dark themes</Text>
               </View>
               <Switch
                 value={darkModeEnabled}
                 onValueChange={(value) => void handleToggleDarkMode(value)}
                 trackColor={{ false: "#D1D5DB", true: theme.primarySoft }}
                 thumbColor={darkModeEnabled ? theme.primary : "#F9FAFB"}
               />
            </View>
          </View>
        </Animated.View>

        {/* Support Section */}
        <Animated.View entering={FadeInUp.delay(300).duration(300)}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 16 }]}>Support</Text>
          <View style={[styles.groupCard, glassSurfaceStyle]}>
            {renderGroupItem(
              "chatbubble-outline",
              "Ionicons",
              "Support Assistant",
              "Chat with our support AI & agents",
              () => router.push("/support"),
              true
            )}
          </View>
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInUp.delay(350).duration(300)}>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            activeOpacity={0.8}
            onPress={() => {
              Alert.alert("Logout", "Do you want to sign out of Fresh & Fold?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Logout",
                  style: "destructive",
                  onPress: () => {
                    void triggerImpactHaptic();
                    void logout();
                  },
                },
              ]);
            }}
          >
            <View style={[styles.groupIconWrap, { backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2" }]}>
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            </View>
            <Text style={[styles.logoutText, { color: "#DC2626" }]}>Log Out</Text>
          </TouchableOpacity>
        </Animated.View>

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
    paddingHorizontal: 20,
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -100,
    right: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  subheader: {
    fontSize: 14,
    lineHeight: 20,
  },
  headerButton: {
    padding: 8,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    marginBottom: 24,
    marginTop: 8,
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  heroMeta: {
    flex: 1,
  },
  heroName: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroPhoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroPhone: {
    fontSize: 14,
    fontWeight: "500",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  statsCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  statColumn: {
    flex: 1,
    alignItems: "center",
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  groupCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    marginTop: 12,
    overflow: "hidden",
  },
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  groupIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  groupCopyWrap: {
    flex: 1,
    paddingRight: 16,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  groupSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 20,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 12,
  },
});
