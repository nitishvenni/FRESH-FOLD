import { MaterialIcons, Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../hooks/useAppTheme";
import { triggerImpactHaptic, triggerSuccessHaptic } from "../utils/haptics";
import { showToast } from "../utils/toast";
import { formatPrice } from "../utils/formatPrice";

export default function OrderConfirmation() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { total, date, slot, orderId, status } = useLocalSearchParams();
  const { theme, isDark } = useAppTheme();

  useEffect(() => {
    void triggerSuccessHaptic();
    showToast({
      type: "success",
      title: "Order confirmed",
      message: "Your pickup has been scheduled successfully.",
    });
  }, []);

  const displayOrderId = String(orderId || "").slice(-6).toUpperCase();
  const displayTotal = total ? Number(total) : 0;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Subtle Atmospheric Background */}
      <View
        style={[
          styles.backgroundGlowTop,
          { backgroundColor: theme.primarySoft, opacity: isDark ? 0.2 : 0.6 },
        ]}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={ZoomIn.duration(400)} style={styles.heroWrap}>
          {/* Outer Halo */}
          <View
            style={[
              styles.haloOuter,
              { backgroundColor: isDark ? "rgba(37,99,235,0.15)" : "rgba(37,99,235,0.1)" },
            ]}
          />
          {/* Inner Frosted Circle */}
          <View
            style={[
              styles.haloInner,
              { backgroundColor: isDark ? "rgba(37,99,235,0.25)" : "rgba(37,99,235,0.15)" },
            ]}
          />
          {/* Solid Check Badge */}
          <View style={[styles.checkBadge, { backgroundColor: theme.primary }]}>
            <MaterialIcons name="check" size={44} color="#FFFFFF" />
          </View>
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(150).duration(300)}
          style={[styles.title, { color: theme.text }]}
        >
          Order Confirmed
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.delay(200).duration(300)}
          style={[styles.subtitle, { color: theme.textMuted }]}
        >
          Your pickup is scheduled and the team is getting ready.
        </Animated.Text>

        <Animated.View entering={FadeInUp.delay(250).duration(300)} style={styles.cardWrap}>
          <View
            style={[
              styles.orderIdCard,
              {
                backgroundColor: isDark ? "rgba(17,24,39,0.4)" : "rgba(255,255,255,0.7)",
                borderColor: isDark ? "rgba(148,163,184,0.15)" : "rgba(255,255,255,0.9)",
              },
            ]}
          >
            <Text style={[styles.orderIdLabel, { color: theme.textMuted }]}>Order ID</Text>
            <Text style={[styles.orderIdValue, { color: theme.text }]}>#{displayOrderId}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).duration(300)} style={styles.cardWrap}>
          <View
            style={[
              styles.detailsCard,
              {
                backgroundColor: isDark ? "rgba(17,24,39,0.4)" : "rgba(255,255,255,0.7)",
                borderColor: isDark ? "rgba(148,163,184,0.15)" : "rgba(255,255,255,0.9)",
              },
            ]}
          >
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: isDark ? "rgba(148,163,184,0.15)" : "#F1F5F9" },
                  ]}
                >
                  <Feather name="calendar" size={16} color={theme.textMuted} />
                </View>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Pickup Scheduled</Text>
              </View>
              <View style={styles.detailRight}>
                <Text style={[styles.detailPrimary, { color: theme.text }]}>{date}</Text>
                <Text style={[styles.detailSecondary, { color: theme.textMuted }]}>{slot}</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: isDark ? "rgba(148,163,184,0.15)" : "#F1F5F9" },
                  ]}
                >
                  <Feather name="file-text" size={16} color={theme.textMuted} />
                </View>
                <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Total Paid</Text>
              </View>
              <View style={styles.detailRight}>
                <Text style={[styles.detailPrimary, { color: theme.text }]}>
                  {formatPrice(displayTotal)}
                </Text>
              </View>
            </View>
            
            <View style={[styles.infoBox, { backgroundColor: theme.primarySoft }]}>
              <Text style={[styles.infoText, { color: theme.primary }]}>
                Your clothes will be collected soon. You can track each status update live.
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Floating Bottom Action Area */}
      <View style={[styles.bottomBarWrap, { paddingBottom: insets.bottom || 20 }]}>
        <BlurView
          intensity={isDark ? 26 : 40}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={[
            styles.bottomBarBorder,
            {
              backgroundColor: isDark ? "rgba(17,24,39,0.5)" : "rgba(255,255,255,0.4)",
              borderTopColor: isDark ? "rgba(148,163,184,0.15)" : "rgba(255,255,255,0.7)",
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            activeOpacity={0.9}
            onPress={() => {
              void triggerImpactHaptic();
              router.replace({
                pathname: "/track-order",
                params: { orderId, status, date, slot },
              });
            }}
          >
            <Text style={styles.buttonText}>Track Order</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  heroWrap: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  haloOuter: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  haloInner: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  checkBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  cardWrap: {
    width: "100%",
    maxWidth: 400,
    marginBottom: 16,
  },
  orderIdCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  orderIdLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  orderIdValue: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 1,
  },
  detailsCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  detailRight: {
    alignItems: "flex-end",
  },
  detailPrimary: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  detailSecondary: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  infoBox: {
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  bottomBarWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  bottomBarBorder: {
    borderTopWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 28,
    gap: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
