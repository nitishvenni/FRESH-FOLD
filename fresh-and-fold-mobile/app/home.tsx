import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { APP_TAB_BAR_CONTENT_INSET } from "../components/AppTabBar";
import { homeDemoContent } from "../constants/homeContent";
import { useAppTheme } from "../hooks/useAppTheme";
import useOrders from "../hooks/useOrders";
import { getMostRelevantActiveOrder } from "../utils/orderStatus";
import { HOME_AI_ACTION_ROUTES } from "../utils/homeAiActionRoutes";
import { getBookingDraftResumeTarget, loadBookingDraft, type BookingDraft } from "../utils/bookingDraft";
import { showToast } from "../utils/toast";
import HomeHero from "../components/home/HomeHero";
import HomeAiActionCards from "../components/home/HomeAiActionCards";
import { CurrentOrderCard, ImpactCard, QuickActions, RecommendationCard } from "../components/home/HomeCards";

const PROFILE_NAME_KEY = "profileName";
const ADDRESSES_CACHE_KEY = "addressesCache";

type AddressCacheItem = { _id?: string; fullName?: string };

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { orders, loading, error, refresh } = useOrders();
  const [firstName, setFirstName] = useState("there");
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);

  const loadDisplayName = useCallback(async () => {
    try {
      const [storedName, cachedAddresses] = await Promise.all([
        AsyncStorage.getItem(PROFILE_NAME_KEY),
        AsyncStorage.getItem(ADDRESSES_CACHE_KEY),
      ]);

      if (storedName?.trim()) {
        setFirstName(getFirstName(storedName));
        return;
      }

      if (cachedAddresses) {
        const addresses = JSON.parse(cachedAddresses) as AddressCacheItem[];
        const addressName = addresses.find((address) => address.fullName?.trim())?.fullName;
        if (addressName) {
          setFirstName(getFirstName(addressName));
          return;
        }
      }
    } catch {
      // The Home greeting deliberately has a neutral fallback when local profile data is unavailable.
    }

    setFirstName("there");
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDisplayName();
    }, [loadDisplayName])
  );

  const loadActiveBookingDraft = useCallback(async () => {
    try {
      const cachedAddresses = await AsyncStorage.getItem(ADDRESSES_CACHE_KEY);
      const addresses = cachedAddresses ? JSON.parse(cachedAddresses) as AddressCacheItem[] : [];
      setBookingDraft(await loadBookingDraft(addresses.map((address) => address._id).filter((id): id is string => Boolean(id))));
    } catch {
      setBookingDraft(await loadBookingDraft([]));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadActiveBookingDraft();
    }, [loadActiveBookingDraft])
  );

  const activeOrder = getMostRelevantActiveOrder(orders);
  const startBooking = () => router.push("/select-service");
  const openAICare = () => router.push(HOME_AI_ACTION_ROUTES.smartScan as never);
  const continueBooking = () => {
    if (!bookingDraft) return;
    const target = getBookingDraftResumeTarget(bookingDraft);
    router.push({ pathname: target.pathname as never, params: target.params });
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/*
       * Fixed atmospheric glow — behind the ScrollView.
       * Spans full screen width (no left/right edges visible).
       * Positioned to cover the hero-to-quick-actions zone.
       * Fades to transparent vertically at both top and bottom.
       * Extremely low opacity — provides subtle richness for blur
       * without any visible rectangular boundary.
       */}
      <View pointerEvents="none" style={styles.atmosphericGlow}>
        {/* Vertical soft blue diffusion — fades to transparent at top and bottom */}
        <LinearGradient
          colors={
            isDark
              ? [
                  "rgba(11,15,22,0)",
                  "rgba(20,38,68,0.18)",
                  "rgba(18,35,60,0.14)",
                  "rgba(11,15,22,0)",
                ]
              : [
                  "rgba(246,249,255,0)",
                  "rgba(200,218,248,0.14)",
                  "rgba(190,214,250,0.12)",
                  "rgba(246,249,255,0)",
                ]
          }
          locations={[0, 0.35, 0.65, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Lateral cool-highlight — right-side hero light spill */}
        <LinearGradient
          colors={
            isDark
              ? ["rgba(79,140,255,0.04)", "rgba(0,0,0,0)"]
              : ["rgba(170,200,248,0.10)", "rgba(246,249,255,0)"]
          }
          start={{ x: 1, y: 0.25 }}
          end={{ x: 0, y: 0.75 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* 
        * SafeArea clipping container.
        * We apply paddingTop here instead of in the ScrollView content.
        * This ensures content starts at the same visual position (under the status bar)
        * but clips cleanly when scrolling up, preventing overlap with system icons.
        */}
      <View style={{ flex: 1, paddingTop: insets.top, overflow: "hidden" }}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: 4,
              paddingBottom: insets.bottom + APP_TAB_BAR_CONTENT_INSET + 80,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
        <Animated.View entering={FadeInDown.duration(300)}>
          <HomeHero
            firstName={firstName}
            onNotificationsPress={() => router.push("/profile")}
          />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(70).duration(300)}>
          <HomeAiActionCards
            onSmartScanPress={openAICare}
            onVoiceBookingPress={() => router.push(HOME_AI_ACTION_ROUTES.voiceBooking as never)}
          />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(120).duration(300)}>
          <QuickActions
            onNewBooking={startBooking}
            bookingAction={bookingDraft
              ? { label: "Continue Booking", subtitle: "Resume where you left off", onPress: continueBooking }
              : { label: "Bookings", subtitle: "No pending booking", onPress: () => showToast({ type: "info", title: "No booking in progress", message: "Start a new booking when you're ready." }) }}
            onOffers={() => showToast({ type: "info", title: "Offers are coming soon" })}
            onRefer={() => showToast({ type: "info", title: "Refer & Earn is coming soon" })}
          />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(170).duration(300)}>
          <CurrentOrderCard
            order={activeOrder}
            loading={loading}
            error={error}
            onRetry={() => void refresh().catch(() => undefined)}
            onNewBooking={startBooking}
            onTrack={() => {
              if (activeOrder) {
                router.push({ pathname: "/track-order", params: { orderId: activeOrder._id, status: activeOrder.status } });
              }
            }}
          />
        </Animated.View>
        {homeDemoContent.recommendation ? (
          <Animated.View entering={FadeInDown.delay(220).duration(300)}>
            <RecommendationCard recommendation={homeDemoContent.recommendation} onPress={startBooking} />
          </Animated.View>
        ) : null}
        {homeDemoContent.impact ? (
          <Animated.View entering={FadeInDown.delay(270).duration(300)}>
            <ImpactCard impact={homeDemoContent.impact} />
          </Animated.View>
        ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  atmosphericGlow: {
    ...StyleSheet.absoluteFillObject,
    // Full-screen layer — no left/right/bottom edges visible.
    // Gradient fades to transparent vertically.
  },
});
