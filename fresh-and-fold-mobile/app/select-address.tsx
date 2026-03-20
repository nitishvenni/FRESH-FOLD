import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
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

const ADDRESSES_CACHE_KEY = "addressesCache";
const SELECTED_ADDRESS_ID_KEY = "selectedAddressId";

type Address = {
  _id: string;
  fullName: string;
  street: string;
  city: string;
  pincode: string;
};

export default function SelectAddress() {
  const router = useRouter();
  const { service, items, date, slot } = useLocalSearchParams();
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
      <View style={[styles.backgroundGlowTop, { backgroundColor: theme.primarySoft, opacity: isDark ? 0.22 : 0.9 }]} />
      <View style={[styles.backgroundGlowBottom, { backgroundColor: theme.primarySoft, opacity: isDark ? 0.14 : 0.5 }]} />

	      <ScrollView
	        style={styles.container}
	        contentContainerStyle={{
	          paddingTop: insets.top + 24,
	          paddingBottom: insets.bottom + 140,
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
        <Text style={[styles.header, { color: theme.text }]}>Select Address</Text>
        <Text style={[styles.subheader, { color: theme.textMuted }]}>
          Choose where you want the pickup team to collect and deliver your order.
        </Text>

	        {addresses.length === 0 ? (
	          <Card style={styles.emptyCard}>
              <View style={styles.emptyAnimationWrap}>
                <EmptyStateAnimation icon="location-on" />
              </View>
	            <Text style={[styles.emptyTitle, { color: theme.text }]}>No address found</Text>
	            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
	              Add a delivery address to continue with this order.
            </Text>
          </Card>
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
            />
          ))
        )}

        <TouchableOpacity
          style={[styles.addButton, { borderColor: theme.primarySoft, backgroundColor: theme.primarySoft }]}
          activeOpacity={0.9}
          onPress={() => {
            void triggerImpactHaptic();
            router.push({
              pathname: "/add-address",
              params: { service, items, date, slot },
            });
          }}
        >
          <View style={styles.addIconWrap}>
            <MaterialIcons name="add-location-alt" size={20} color={theme.primary} />
          </View>
          <Text style={[styles.addButtonText, { color: theme.primary }]}>Add New Address</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 18, backgroundColor: theme.glass }]}>
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: theme.text }, !selected && styles.continueButtonDisabled]}
          disabled={!selected}
          activeOpacity={0.9}
          onPress={async () => {
            if (selected) {
              await AsyncStorage.setItem(SELECTED_ADDRESS_ID_KEY, selected);
            }
            void triggerImpactHaptic();
            router.push({
              pathname: "/order-summary",
              params: {
                service,
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
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -90,
    right: -36,
    width: 210,
    height: 210,
    borderRadius: 105,
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: 110,
    left: -70,
    width: 190,
    height: 190,
    borderRadius: 95,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subheader: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  emptyCard: {
    marginBottom: 16,
    alignItems: "center",
  },
  emptyAnimationWrap: {
    marginBottom: 4,
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
    marginTop: 4,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  addIconWrap: {
    marginRight: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  continueButton: {
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
