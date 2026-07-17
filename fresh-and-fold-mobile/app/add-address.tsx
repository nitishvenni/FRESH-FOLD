import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { MapPressEvent, Region } from "react-native-maps";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAppTheme } from "../hooks/useAppTheme";
import { colors, radius, shadows, spacing, typography } from "../theme/theme";
import { apiRequest } from "../utils/api";
import { handleError } from "../utils/errorHandler";
import { triggerImpactHaptic, triggerSelectionHaptic } from "../utils/haptics";
import { showToast } from "../utils/toast";

const ADDRESSES_CACHE_KEY = "addressesCache";
const SELECTED_ADDRESS_ID_KEY = "selectedAddressId";
const DEFAULT_REGION: Region = {
  latitude: 17.385,
  longitude: 78.4867,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const addressTypes = [
  { value: "House", icon: "home" },
  { value: "Office", icon: "work-outline" },
  { value: "Other", icon: "near-me" },
] as const;

type AddressType = (typeof addressTypes)[number]["value"];

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
  addressType?: AddressType;
  instructions?: string;
  latitude?: number;
  longitude?: number;
};

type FieldCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "phone-pad" | "number-pad";
  maxLength?: number;
  multiline?: boolean;
};

let NativeMapView: any = null;
let NativeMarker: any = null;

try {
  const maps = require("react-native-maps");
  NativeMapView = maps.default;
  NativeMarker = maps.Marker;
} catch {
  NativeMapView = null;
  NativeMarker = null;
}

function asStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatLocationLine(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .filter((part, index, all) => all.indexOf(part) === index)
    .join(", ");
}

function FieldCard({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  maxLength,
  multiline,
}: FieldCardProps) {
  const { theme } = useAppTheme();
  return (
    <Input
      variant="glass"
      containerStyle={[styles.inputCard, multiline && styles.multilineInputCard]}
      leading={<Ionicons name={icon} size={18} color={theme.textMuted} />}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      maxLength={maxLength}
      multiline={multiline}
      style={multiline ? styles.multilineInput : undefined}
    />
  );
}

export default function AddAddress() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const params = useLocalSearchParams();
  const { service, items, date, slot } = params;
  const editAddressId = asStringParam(params.addressId);
  const scrollRef = useRef<ScrollView>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [building, setBuilding] = useState("");
  const [locality, setLocality] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [addressType, setAddressType] = useState<AddressType>("House");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [selectedCoordinate, setSelectedCoordinate] = useState({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });

  const canUseNativeMap = useMemo(
    () =>
      Boolean(
        NativeMapView &&
          NativeMarker &&
          (Constants.appOwnership as string | null) === "standalone"
      ),
    []
  );
  const isEditing = Boolean(editAddressId);
  const locationSummary = formatLocationLine([locality, city, pincode]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!editAddressId) {
      return;
    }

    void hydrateAddressForEdit(editAddressId);
  }, [editAddressId]);

  const hydrateAddressForEdit = async (addressId: string) => {
    try {
      const cached = await AsyncStorage.getItem(ADDRESSES_CACHE_KEY);
      let addresses = (cached ? JSON.parse(cached) : []) as Address[];

      if (!addresses.some((address) => address._id === addressId)) {
        const data = await apiRequest<{ success: boolean; addresses: Address[] }>("/addresses");
        addresses = data.addresses || [];
        await AsyncStorage.setItem(ADDRESSES_CACHE_KEY, JSON.stringify(addresses));
      }

      const address = addresses.find((item) => item._id === addressId);
      if (!address) {
        showToast({
          type: "error",
          title: "Address not found",
          message: "Please add this address again.",
        });
        return;
      }

      setFullName(address.fullName || "");
      setPhone(address.phone || "");
      setHouseNumber(address.houseNumber || "");
      setBuilding(address.building || "");
      setLocality(address.locality || address.street || "");
      setCity(address.city || "");
      setPincode(address.pincode || "");
      setAddressType(address.addressType || "House");
      setInstructions(address.instructions || "");

      if (typeof address.latitude === "number" && typeof address.longitude === "number") {
        setSelectedCoordinate({ latitude: address.latitude, longitude: address.longitude });
        setMapRegion({
          latitude: address.latitude,
          longitude: address.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        });
      }
    } catch (error) {
      handleError(error);
    }
  };

  const validateAddress = () => {
    const normalizedName = fullName.trim();
    const normalizedPhone = phone.trim();
    const normalizedHouse = houseNumber.trim();
    const normalizedLocality = locality.trim();
    const normalizedCity = city.trim();
    const normalizedPincode = pincode.trim();

    if (
      !normalizedName ||
      !normalizedPhone ||
      !normalizedHouse ||
      !normalizedLocality ||
      !normalizedCity ||
      !normalizedPincode
    ) {
      return "Please fill receiver, house, locality, city, and pincode.";
    }

    if (!/^\d{10}$/.test(normalizedPhone)) {
      return "Enter a valid 10-digit phone number.";
    }

    if (!/^\d{6}$/.test(normalizedPincode)) {
      return "Enter a valid 6-digit pincode.";
    }

    if (normalizedName.length < 2) {
      return "Enter the full name for this address.";
    }

    return null;
  };

  const applyReverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });

      if (!result) {
        showToast({
          type: "info",
          title: "Location found",
          message: "We could not read the full address. Please fill the remaining details.",
        });
        return;
      }

      const nextLocality = formatLocationLine([
        result.name,
        result.street,
        result.district,
        result.subregion,
      ]);

      if (nextLocality) {
        setLocality(nextLocality);
        setSearchText(nextLocality);
      }

      const bestCity = result.city || result.subregion || result.region || "";
      if (bestCity) {
        setCity(bestCity);
      }

      if (result.postalCode) {
        setPincode(String(result.postalCode).replace(/\D/g, "").slice(0, 6));
      }
    } catch (error) {
      handleError(error);
    }
  };

  const updateMapLocation = async (latitude: number, longitude: number) => {
    setSelectedCoordinate({ latitude, longitude });
    setMapRegion((prev) => ({
      ...prev,
      latitude,
      longitude,
    }));
    await applyReverseGeocode(latitude, longitude);
  };

  const requestCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        showToast({
          type: "error",
          title: "Location permission needed",
          message: "Allow location access to auto-fill your pickup address.",
        });
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const nextLatitude = current.coords.latitude;
      const nextLongitude = current.coords.longitude;

      setMapRegion({
        latitude: nextLatitude,
        longitude: nextLongitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      });
      setSelectedCoordinate({
        latitude: nextLatitude,
        longitude: nextLongitude,
      });

      await applyReverseGeocode(nextLatitude, nextLongitude);
      void triggerSelectionHaptic();
      showToast({
        type: "success",
        title: "Location selected",
        message: "Now add the house or flat details.",
      });
    } catch (error) {
      handleError(error);
    } finally {
      setLocationLoading(false);
    }
  };

  const searchLocation = async () => {
    const query = searchText.trim();
    if (!query) {
      showToast({
        type: "info",
        title: "Search location",
        message: "Enter an area, landmark, or address to search.",
      });
      return;
    }

    try {
      setLocationLoading(true);
      const results = await Location.geocodeAsync(query);
      const first = results[0];

      if (!first) {
        showToast({
          type: "error",
          title: "Location not found",
          message: "Try searching with a nearby landmark or area name.",
        });
        return;
      }

      setMapRegion({
        latitude: first.latitude,
        longitude: first.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      });
      await updateMapLocation(first.latitude, first.longitude);
    } catch (error) {
      handleError(error);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    void updateMapLocation(latitude, longitude);
  };

  const buildPayload = () => {
    const street = formatLocationLine([houseNumber, building, locality]);

    return {
      fullName: fullName.trim(),
      phone: phone.trim(),
      street,
      city: city.trim(),
      pincode: pincode.trim(),
      houseNumber: houseNumber.trim(),
      building: building.trim(),
      locality: locality.trim(),
      addressType,
      instructions: instructions.trim(),
      latitude: selectedCoordinate.latitude,
      longitude: selectedCoordinate.longitude,
    };
  };

  const saveAddress = async () => {
    const validationMessage = validateAddress();
    if (validationMessage) {
      showToast({
        type: "error",
        title: "Invalid address",
        message: validationMessage,
      });
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload();
      const endpoint = isEditing ? `/addresses/${editAddressId}` : "/addresses";
      const data = await apiRequest<{ success: boolean; address: Address }>(endpoint, {
        method: isEditing ? "PUT" : "POST",
        body: payload,
      });

      const savedAddress = data.address;
      const cached = await AsyncStorage.getItem(ADDRESSES_CACHE_KEY);
      const parsedCache = (cached ? JSON.parse(cached) : []) as Address[];
      const withoutSaved = parsedCache.filter((address) => address._id !== savedAddress?._id);
      const nextCache = [savedAddress, ...withoutSaved];
      await AsyncStorage.setItem(ADDRESSES_CACHE_KEY, JSON.stringify(nextCache));
      if (savedAddress?._id) {
        await AsyncStorage.setItem(SELECTED_ADDRESS_ID_KEY, savedAddress._id);
      }

      void triggerImpactHaptic();
      showToast({
        type: "success",
        title: isEditing ? "Address updated" : "Address saved",
        message: "Your pickup address is ready to use.",
      });
      router.replace({
        pathname: "/select-address",
        params: { service, items, date, slot },
      });
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  };

  const renderMapSurface = () => {
    if (canUseNativeMap) {
      return (
        <NativeMapView style={styles.map} region={mapRegion} onPress={handleMapPress}>
          <NativeMarker
            coordinate={selectedCoordinate}
            draggable
            onDragEnd={(event: MapPressEvent) => {
              const { latitude, longitude } = event.nativeEvent.coordinate;
              void updateMapLocation(latitude, longitude);
            }}
          />
        </NativeMapView>
      );
    }

    return (
      <View style={[styles.mapFallback, { backgroundColor: isDark ? "#172033" : "#F1F5F9" }]}>
        <View style={[styles.mapRoad, styles.mapRoadOne]} />
        <View style={[styles.mapRoad, styles.mapRoadTwo]} />
        <View style={[styles.mapRoad, styles.mapRoadThree]} />
        <View style={styles.pinShadow} />
        <View style={[styles.pin, { backgroundColor: theme.primary }]}>
          <Ionicons name="location" size={24} color="#FFFFFF" />
        </View>
        <Text style={[styles.mapFallbackText, { color: theme.textMuted }]}>
          Use current location or search to place the delivery pin.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.flex}>
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingTop: spacing.md,
              paddingHorizontal: spacing.lg,
              paddingBottom: 120 + insets.bottom, // Ensure forms are well clear of the CTA
            }}
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <MaterialIcons name="arrow-back" size={24} color={theme.text} />
              </TouchableOpacity>
              <View style={styles.headerCopy}>
                <Text style={[styles.title, { color: theme.text }]}>
                  {isEditing ? "Edit Address" : "Add Address"}
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
                  {locationSummary || "Select exact pickup location"}
                </Text>
              </View>
            </View>

            {/* Search Input */}
            <Input
              variant="glass"
              containerStyle={styles.searchRow}
              leading={<Feather name="search" size={20} color={theme.textMuted} />}
              placeholder="Search an area or address"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              onSubmitEditing={() => {
                void searchLocation();
              }}
            />
            {/* Hidden button behind input logic... we can keep it clean by just using the submit on keyboard, or placing a small button */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.searchButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                void searchLocation();
              }}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <View
              style={[
                styles.mapCard,
                {
                  backgroundColor: isDark ? "rgba(17,24,39,0.4)" : "rgba(255,255,255,0.7)",
                  borderColor: isDark ? "rgba(148,163,184,0.15)" : "rgba(255,255,255,0.9)",
                },
              ]}
            >
              {renderMapSurface()}

              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.currentLocationButton,
                  {
                    backgroundColor: isDark ? "rgba(17,24,39,0.8)" : "rgba(255,255,255,0.9)",
                    borderColor: isDark ? "rgba(148,163,184,0.15)" : "rgba(226,232,240,0.8)",
                  },
                ]}
                onPress={() => {
                  void requestCurrentLocation();
                }}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <MaterialIcons name="my-location" size={18} color={theme.primary} />
                )}
                <Text style={[styles.currentLocationText, { color: theme.text }]}>Current location</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Receiver Details</Text>
            <View style={styles.inputGroup}>
              <FieldCard
                icon="person-outline"
                placeholder="Full name *"
                value={fullName}
                onChangeText={setFullName}
              />
              <FieldCard
                icon="call-outline"
                placeholder="Phone number *"
                value={phone}
                onChangeText={(value) => setPhone(value.replace(/\D/g, "").slice(0, 10))}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Location Details</Text>
            
            {/* Custom Pill Selector */}
            <View
              style={[
                styles.typeTabs,
                {
                  backgroundColor: isDark ? "rgba(17,24,39,0.4)" : "rgba(255,255,255,0.7)",
                  borderColor: isDark ? "rgba(148,163,184,0.15)" : "rgba(255,255,255,0.9)",
                },
              ]}
            >
              {addressTypes.map((item) => {
                const selected = addressType === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    activeOpacity={0.8}
                    style={[
                      styles.typeTab,
                      selected && { backgroundColor: theme.primary },
                    ]}
                    onPress={() => {
                      void triggerSelectionHaptic();
                      setAddressType(item.value);
                    }}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={16}
                      color={selected ? "#FFFFFF" : theme.textMuted}
                    />
                    <Text
                      style={[
                        styles.typeText,
                        { color: selected ? "#FFFFFF" : theme.text },
                      ]}
                    >
                      {item.value}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.inputGroup}>
              <FieldCard
                icon="home-outline"
                placeholder="House / Flat / Floor *"
                value={houseNumber}
                onChangeText={setHouseNumber}
              />
              <FieldCard
                icon="business-outline"
                placeholder="Building / Street (recommended)"
                value={building}
                onChangeText={setBuilding}
              />
              <FieldCard
                icon="map-outline"
                placeholder="Area / Locality *"
                value={locality}
                onChangeText={setLocality}
                multiline
              />
              <FieldCard
                icon="location-outline"
                placeholder="City *"
                value={city}
                onChangeText={setCity}
              />
              <FieldCard
                icon="mail-outline"
                placeholder="Pincode *"
                value={pincode}
                onChangeText={(value) => setPincode(value.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
            <View style={styles.inputGroup}>
              <FieldCard
                icon="chatbubble-ellipses-outline"
                placeholder="Delivery instructions (optional)"
                value={instructions}
                onChangeText={setInstructions}
                multiline
              />
            </View>
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
                style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                activeOpacity={0.9}
                onPress={() => {
                  void saveAddress();
                }}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.saveText}>{isEditing ? "Update Address" : "Save Address"}</Text>
                    <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  searchRow: {
    marginBottom: 24,
    paddingRight: 50, // Space for the arrow button
  },
  searchButton: {
    position: "absolute",
    right: 28,
    top: 79, // roughly inside the search row (will adjust below if needed, better to position relative if possible but safeArea/ScrollView context makes it hard)
    // Actually, let's position it nicely inside a wrapper or just absolutely position it carefully.
    // wait, we can just position it relative to the container if we wrap them.
    // For simplicity, I'll keep the absolute positioning but align it to the input height.
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: -59 }], // adjusted to sit inside the searchRow
  },
  mapCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 8,
    marginBottom: 24,
  },
  map: {
    height: 200,
    borderRadius: 14,
  },
  mapFallback: {
    height: 200,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  mapRoad: {
    position: "absolute",
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(148, 163, 184, 0.18)",
  },
  mapRoadOne: {
    width: 390,
    transform: [{ rotate: "28deg" }],
  },
  mapRoadTwo: {
    width: 390,
    transform: [{ rotate: "-35deg" }],
  },
  mapRoadThree: {
    width: 150,
    transform: [{ rotate: "90deg" }],
  },
  pinShadow: {
    position: "absolute",
    width: 14,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 2,
    marginTop: 28,
  },
  pin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  mapFallbackText: {
    position: "absolute",
    bottom: 16,
    fontSize: 12,
    fontWeight: "500",
  },
  currentLocationButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  currentLocationText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 8,
  },
  inputGroup: {
    gap: 12,
    marginBottom: 24,
  },
  inputCard: {
    marginBottom: 0, // Handled by gap
  },
  multilineInputCard: {
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  typeTabs: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  typeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  typeText: {
    fontSize: 13,
    fontWeight: "600",
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
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 26,
    gap: 8,
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
