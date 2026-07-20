import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { cancelAnimation, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { APP_TAB_BAR_CONTENT_INSET } from "../components/AppTabBar";
import HomeAiActionCards from "../components/home/HomeAiActionCards";
import { CurrentOrderCard, ImpactCard, QuickActions, RecommendationCard } from "../components/home/HomeCards";
import HomeHero from "../components/home/HomeHero";
import { homeDemoContent } from "../constants/homeContent";
import { useAppTheme } from "../hooks/useAppTheme";
import useOrders from "../hooks/useOrders";
import { getBookingDraftResumeTarget, loadBookingDraft, type BookingDraft } from "../utils/bookingDraft";
import { HOME_AI_ACTION_ROUTES } from "../utils/homeAiActionRoutes";
import { getMostRelevantActiveOrder } from "../utils/orderStatus";
import { showToast } from "../utils/toast";
import { getPendingPaymentIntentId } from "../services/paymentService";

const PROFILE_NAME_KEY = "profileName";
const ADDRESSES_CACHE_KEY = "addressesCache";

type AddressCacheItem = { _id?: string; fullName?: string };
type HomeLocalState = { firstName: string; bookingDraft: BookingDraft | null };

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

function HomeEntranceGroup({ children, delay, translateY = 6 }: { children: ReactNode; delay: number; translateY?: number }) {
  const reducedMotion = useReducedMotion();
  const entrance = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    cancelAnimation(entrance);
    if (reducedMotion) {
      entrance.value = 1;
      return;
    }

    entrance.value = 0;
    entrance.value = withDelay(delay, withTiming(1, { duration: 220, reduceMotion: ReduceMotion.System }));
    return () => cancelAnimation(entrance);
  }, [delay, entrance, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.01 + entrance.value * 0.99,
    transform: [{ translateY: (1 - entrance.value) * translateY }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { theme } = useAppTheme();
  const { orders, loading, error, refresh } = useOrders();
  const [firstName, setFirstName] = useState("there");
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);
  const pendingPaymentRecoveryChecked = useRef(false);

  useEffect(() => {
    if (pendingPaymentRecoveryChecked.current) return;
    pendingPaymentRecoveryChecked.current = true;
    void getPendingPaymentIntentId().then((paymentIntentId) => {
      if (paymentIntentId) router.push({ pathname: "/payment-recovery", params: { paymentIntentId } });
    }).catch(() => undefined);
  }, [router]);

  const loadHomeState = useCallback(async () => {
    try {
      const [storedName, cachedAddresses] = await Promise.all([
        AsyncStorage.getItem(PROFILE_NAME_KEY),
        AsyncStorage.getItem(ADDRESSES_CACHE_KEY),
      ]);
      const addresses = cachedAddresses ? JSON.parse(cachedAddresses) as AddressCacheItem[] : [];
      const addressName = addresses.find((address) => address.fullName?.trim())?.fullName;

      return {
        firstName: storedName?.trim() ? getFirstName(storedName) : addressName ? getFirstName(addressName) : "there",
        bookingDraft: await loadBookingDraft(addresses.map((address) => address._id).filter((id): id is string => Boolean(id))),
      } satisfies HomeLocalState;
    } catch {
      return { firstName: "there", bookingDraft: await loadBookingDraft([]) } satisfies HomeLocalState;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadHomeState().then((nextState) => {
        if (!active) return;
        setFirstName(nextState.firstName);
        setBookingDraft(nextState.bookingDraft);
      });

      return () => {
        active = false;
      };
    }, [loadHomeState])
  );

  const activeOrder = useMemo(() => getMostRelevantActiveOrder(orders), [orders]);
  const startBooking = useCallback(() => router.push("/select-service"), [router]);
  const openAICare = useCallback(() => router.push(HOME_AI_ACTION_ROUTES.smartScan as never), [router]);
  const openVoiceBooking = useCallback(() => router.push(HOME_AI_ACTION_ROUTES.voiceBooking as never), [router]);
  const openProfile = useCallback(() => router.push("/profile"), [router]);
  const continueBooking = useCallback(() => {
    if (!bookingDraft) return;
    const target = getBookingDraftResumeTarget(bookingDraft);
    router.push({ pathname: target.pathname as never, params: target.params });
  }, [bookingDraft, router]);
  const showNoPendingBooking = useCallback(
    () => showToast({ type: "info", title: "No booking in progress", message: "Start a new booking when you're ready." }),
    []
  );
  const showOffers = useCallback(() => showToast({ type: "info", title: "Offers are coming soon" }), []);
  const showRefer = useCallback(() => showToast({ type: "info", title: "Refer & Earn is coming soon" }), []);
  const retryOrders = useCallback(() => void refresh().catch(() => undefined), [refresh]);
  const trackOrder = useCallback(() => {
    if (activeOrder) {
      router.push({ pathname: "/track-order", params: { orderId: activeOrder._id, status: activeOrder.status } });
    }
  }, [activeOrder, router]);
  const bookingAction = useMemo(
    () => bookingDraft
      ? { label: "Continue Booking" as const, subtitle: "Resume where you left off", onPress: continueBooking }
      : { label: "Bookings" as const, subtitle: "No pending booking", onPress: showNoPendingBooking },
    [bookingDraft, continueBooking, showNoPendingBooking]
  );
  const screenPadding = width < 360 ? 14 : width >= 430 ? 20 : 16;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.scrollRegion, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: screenPadding, paddingTop: 6, paddingBottom: insets.bottom + APP_TAB_BAR_CONTENT_INSET + 80 }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
        >
          <HomeEntranceGroup delay={0} translateY={8}>
            <HomeHero firstName={firstName} onNotificationsPress={openProfile} />
          </HomeEntranceGroup>
          <HomeEntranceGroup delay={60}>
            <HomeAiActionCards onSmartScanPress={openAICare} onVoiceBookingPress={openVoiceBooking} />
            <QuickActions
              onNewBooking={startBooking}
              bookingAction={bookingAction}
              onOffers={showOffers}
              onRefer={showRefer}
            />
          </HomeEntranceGroup>
          <HomeEntranceGroup delay={120} translateY={4}>
            <CurrentOrderCard
              order={activeOrder}
              loading={loading}
              error={error}
              onRetry={retryOrders}
              onNewBooking={startBooking}
              onTrack={trackOrder}
            />
            {homeDemoContent.recommendation ? (
              <RecommendationCard recommendation={homeDemoContent.recommendation} onPress={startBooking} />
            ) : null}
            {homeDemoContent.impact ? <ImpactCard impact={homeDemoContent.impact} /> : null}
          </HomeEntranceGroup>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollRegion: { flex: 1, overflow: "hidden" },
});
