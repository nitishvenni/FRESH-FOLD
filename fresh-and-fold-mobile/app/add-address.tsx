import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
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
  return (
    <Input
      containerStyle={[styles.inputCard, multiline && styles.multilineInputCard]}
      leading={<Ionicons name={icon} size={20} color={colors.textSecondary} />}
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
              paddingBottom: 150 + insets.bottom + (keyboardHeight > 0 ? 24 : 0),
            }}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={22} color={theme.text} />
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

            <View style={[styles.searchRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Input
                containerStyle={styles.searchInput}
                leading={<Ionicons name="search-outline" size={21} color={theme.textMuted} />}
                placeholder="Search an area or address"
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
                onSubmitEditing={() => {
                  void searchLocation();
                }}
              />
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
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            <View style={[styles.mapCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {renderMapSurface()}
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.currentLocationButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
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

              <View style={[styles.locationSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.sheetHint, { color: theme.textMuted }]}>
                  Place the pin at exact pickup location
                </Text>
                <View style={styles.locationTitleRow}>
                  <Ionicons name="location" size={28} color={theme.primary} />
                  <View style={styles.locationCopy}>
                    <Text style={[styles.locationTitle, { color: theme.text }]} numberOfLines={1}>
                      {locality || "Select your area"}
                    </Text>
                    <Text style={[styles.locationSubtitle, { color: theme.textMuted }]}>
                      {formatLocationLine([city, pincode]) || "Search or use current location"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Receiver Details</Text>
            <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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
            <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.typeTabs, { backgroundColor: theme.background }]}>
                {addressTypes.map((item) => {
                  const selected = addressType === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      activeOpacity={0.9}
                      style={[
                        styles.typeTab,
                        selected && { backgroundColor: theme.text },
                      ]}
                      onPress={() => setAddressType(item.value)}
                    >
                      <MaterialIcons
                        name={item.icon}
                        size={19}
                        color={selected ? theme.surface : theme.text}
                      />
                      <Text style={[styles.typeText, { color: selected ? theme.surface : theme.text }]}>
                        {item.value}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

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

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Delivery Instructions</Text>
            <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <FieldCard
                icon="chatbubble-ellipses-outline"
                placeholder="Instructions to reach location (optional)"
                value={instructions}
                onChangeText={setInstructions}
                multiline
              />
            </View>
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                backgroundColor: theme.background,
                paddingBottom: insets.bottom + spacing.md,
              },
            ]}
          >
            <Button
              style={[styles.button, { backgroundColor: theme.primary }]}
              title={saving ? "Saving..." : isEditing ? "Update Address" : "Save Address"}
              onPress={() => {
                void saveAddress();
              }}
              loading={saving}
            />
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
    marginBottom: spacing.md,
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: typography.bold,
    marginBottom: 3,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: typography.body,
  },
  searchRow: {
    minHeight: 58,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 7,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    backgroundColor: "transparent",
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  mapCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  map: {
    height: 315,
    borderRadius: radius.md,
  },
  mapFallback: {
    height: 315,
    borderRadius: radius.md,
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
    width: 330,
    transform: [{ rotate: "-34deg" }],
    top: 70,
  },
  mapRoadThree: {
    width: 300,
    transform: [{ rotate: "-8deg" }],
    bottom: 62,
  },
  pinShadow: {
    position: "absolute",
    width: 34,
    height: 12,
    borderRadius: 17,
    backgroundColor: "rgba(37, 99, 235, 0.18)",
    top: 163,
  },
  pin: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.floating,
  },
  mapFallbackText: {
    position: "absolute",
    bottom: 72,
    left: spacing.md,
    right: spacing.md,
    textAlign: "center",
    fontSize: 13,
    fontFamily: typography.medium,
  },
  currentLocationButton: {
    position: "absolute",
    alignSelf: "center",
    top: 240,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...shadows.card,
  },
  currentLocationText: {
    fontSize: 14,
    fontFamily: typography.semibold,
  },
  locationSheet: {
    marginTop: -28,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.floating,
  },
  sheetHint: {
    fontSize: 13,
    fontFamily: typography.medium,
    marginBottom: spacing.sm,
  },
  locationTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  locationCopy: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  locationTitle: {
    fontSize: 20,
    fontFamily: typography.bold,
    marginBottom: 5,
  },
  locationSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.body,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: typography.bold,
    marginBottom: spacing.sm,
  },
  sectionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  typeTabs: {
    minHeight: 58,
    borderRadius: radius.lg,
    padding: 5,
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  typeTab: {
    flex: 1,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  typeText: {
    fontSize: 14,
    fontFamily: typography.semibold,
  },
  inputCard: {
    marginBottom: spacing.sm + 2,
    shadowOpacity: 0,
    elevation: 0,
  },
  multilineInputCard: {
    alignItems: "flex-start",
    paddingTop: 2,
  },
  multilineInput: {
    minHeight: 76,
    textAlignVertical: "top",
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  button: {
    ...shadows.floating,
  },
});
