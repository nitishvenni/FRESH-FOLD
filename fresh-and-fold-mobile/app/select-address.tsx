import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AddressCard from "../components/AddressCard";
import Card from "../components/Card";
import EmptyStateAnimation from "../components/EmptyStateAnimation";
import OrderSkeleton from "../components/OrderSkeleton";
import { useAppTheme } from "../hooks/useAppTheme";
import { apiRequest } from "../utils/api";
import { handleError } from "../utils/errorHandler";
import { triggerImpactHaptic, triggerSelectionHaptic } from "../utils/haptics";
import { showToast } from "../utils/toast";
import { saveBookingDraft } from "../utils/bookingDraft";
import { getNormalizedCleaningService, getNormalizedSpeed } from "../utils/pricing";
import { isPickupSlot } from "../utils/bookingSchedule";

const ADDRESSES_CACHE_KEY = "addressesCache";
const SELECTED_ADDRESS_ID_KEY = "selectedAddressId";

type Address = {
  _id: string;
  fullName: string;
  phone?: string;
  street: string;
  city: string;
  pincode: string;
  houseNumber?: string;
  building?: string;
  locality?: string;
  addressType?: string;
  instructions?: string;
  latitude?: number;
  longitude?: number;
};

export default function SelectAddress() {
  const router = useRouter();
  const { cleaningService, speed, items, date, slot } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasHydratedCacheRef = useRef(false);

  useEffect(() => {
    void bootstrapAddresses();
  }, []);

  const applySelection = async (list: Address[]) => {
    const lastSelected = await AsyncStorage.getItem(SELECTED_ADDRESS_ID_KEY);
    if (lastSelected && list.some((addr) => addr._id === lastSelected)) {
      setSelected(lastSelected);
    } else if (list[0]?._id) {
      setSelected(list[0]._id);
    }
  };

  const bootstrapAddresses = async () => {
    try {
      const [cachedAddresses, lastSelected] = await Promise.all([
        AsyncStorage.getItem(ADDRESSES_CACHE_KEY),
        AsyncStorage.getItem(SELECTED_ADDRESS_ID_KEY),
      ]);

      const parsedCache = (cachedAddresses ? JSON.parse(cachedAddresses) : []) as Address[];
      if (parsedCache.length > 0) {
        hasHydratedCacheRef.current = true;
        setAddresses(parsedCache);
        if (lastSelected && parsedCache.some((addr) => addr._id === lastSelected)) {
          setSelected(lastSelected);
        } else if (parsedCache[0]?._id) {
          setSelected(parsedCache[0]._id);
        }
        setLoading(false);
      }
    } catch {
      // Ignore cache bootstrap issues and fall back to network fetch.
    }

    await fetchAddresses();
  };

  const fetchAddresses = async () => {
    try {
      const data = await apiRequest<{ success: boolean; addresses: Address[] }>("/addresses");
      const serverAddresses = data.addresses || [];
      setAddresses(serverAddresses);
      await AsyncStorage.setItem(ADDRESSES_CACHE_KEY, JSON.stringify(serverAddresses));
      await applySelection(serverAddresses);
    } catch (error) {
      if (!hasHydratedCacheRef.current) {
        handleError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedAddress = addresses.find((addr) => addr._id === selected);

  if (loading) {
    return <OrderSkeleton />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Subtle Atmospheric Background */}
      <View
        style={[
          styles.backgroundGlowTop,
          { backgroundColor: theme.primarySoft, opacity: isDark ? 0.15 : 0.6 },
        ]}
      />

      {/* Header */}
      <View
        style={[
          styles.headerRow,
          { paddingTop: insets.top, paddingHorizontal: 20 },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Select Address</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 120, // Enough padding so CTA doesn't cover last item
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void (async () => {
                try {
                  setRefreshing(true);
                  await fetchAddresses();
                  showToast({
                    type: "success",
                    title: "Addresses refreshed",
                  });
                } catch (error) {
                  handleError(error);
                } finally {
                  setRefreshing(false);
                }
              })();
            }}
            tintColor={theme.primary}
          />
        }
      >
        <Text style={[styles.subheader, { color: theme.textMuted }]}>
          Choose where you want the pickup team to collect and deliver your order.
        </Text>

        {addresses.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyAnimationWrap}>
              <EmptyStateAnimation icon="location-on" />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No saved addresses yet</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Add an address to schedule your pickup.
            </Text>
          </View>
        ) : (
          addresses.map((address) => (
            <AddressCard
              key={address._id}
              address={address}
              selected={selected === address._id}
              onPress={() => {
                void triggerSelectionHaptic();
                setSelected(address._id);
              }}
              onEdit={() => {
                void triggerImpactHaptic();
                router.push({
                  pathname: "/add-address",
                  params: { cleaningService, speed, items, date, slot, addressId: address._id },
                });
              }}
            />
          ))
        )}

        <TouchableOpacity
          style={[
            styles.addButton,
            {
              backgroundColor: isDark ? "rgba(17,24,39,0.4)" : "rgba(255,255,255,0.7)",
              borderColor: isDark ? "rgba(148,163,184,0.15)" : "rgba(255,255,255,0.9)",
            },
          ]}
          activeOpacity={0.85}
          onPress={() => {
            void triggerImpactHaptic();
            router.push({
              pathname: "/add-address",
              params: { cleaningService, speed, items, date, slot },
            });
          }}
        >
          <View style={styles.addIconWrap}>
            <MaterialIcons name="add-location-alt" size={20} color={theme.primary} />
          </View>
          <Text style={[styles.addButtonText, { color: theme.text }]}>Add New Address</Text>
          <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} style={{ marginLeft: "auto" }} />
        </TouchableOpacity>
      </ScrollView>

      {/* Floating Bottom Summary */}
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
            style={[
              styles.continueBtn,
              { backgroundColor: theme.primary },
              !selected && styles.continueButtonDisabled,
            ]}
            disabled={!selected}
            activeOpacity={0.9}
            onPress={async () => {
              if (selected) {
                await AsyncStorage.setItem(SELECTED_ADDRESS_ID_KEY, selected);
              }
              let parsedItems: unknown = {};
              try { parsedItems = typeof items === "string" ? JSON.parse(items) : {}; } catch { parsedItems = {}; }
              const pickupDate = Array.isArray(date) ? date[0] : date;
              const slotValue = Array.isArray(slot) ? slot[0] : slot;
              const pickupSlot = isPickupSlot(slotValue) ? slotValue : undefined;
              await saveBookingDraft({
                items: parsedItems as Record<string, number>,
                cleaningService: getNormalizedCleaningService(cleaningService),
                speed: getNormalizedSpeed(speed),
                pickupDate,
                pickupSlot,
                addressId: selectedAddress?._id,
                lastStep: "order_summary",
              }, selectedAddress?._id ? [selectedAddress._id] : []);
              void triggerImpactHaptic();
              router.push({
                pathname: "/order-summary",
                params: {
                  cleaningService,
                  speed,
                  items,
                  date,
                  slot,
                  addressId: selectedAddress?._id,
                  addressName: selectedAddress?.fullName,
                },
              });
            }}
          >
            <Text style={styles.continueText}>Continue</Text>
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
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -100,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  backButtonPlaceholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  subheader: {
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  emptyWrap: {
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyAnimationWrap: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  addButton: {
    marginTop: 8,
    height: 60,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  addIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(59,130,246,0.1)", // Very subtle tint just for the icon
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "700",
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
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 26,
    gap: 8,
  },
  continueButtonDisabled: {
    opacity: 0.45,
  },
  continueText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
