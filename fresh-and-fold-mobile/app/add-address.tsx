import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, MapPressEvent, Region } from "react-native-maps";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useAppTheme } from "../hooks/useAppTheme";
import { colors, radius, shadows, spacing, typography } from "../theme/theme";
import { apiRequest } from "../utils/api";
import { handleError } from "../utils/errorHandler";
import { triggerImpactHaptic } from "../utils/haptics";
import { showToast } from "../utils/toast";

const ADDRESSES_CACHE_KEY = "addressesCache";
const SELECTED_ADDRESS_ID_KEY = "selectedAddressId";
const DEFAULT_REGION: Region = {
  latitude: 17.385,
  longitude: 78.4867,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

type FieldCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "phone-pad" | "number-pad";
  maxLength?: number;
};

function FieldCard({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  maxLength,
}: FieldCardProps) {
  return (
    <Input
      containerStyle={styles.inputCard}
      leading={<Ionicons name={icon} size={20} color={colors.textSecondary} />}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      maxLength={maxLength}
    />
  );
}

export default function AddAddress() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { service, items, date, slot } = useLocalSearchParams();
  const scrollRef = useRef<ScrollView>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [extraDetails, setExtraDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [selectedCoordinate, setSelectedCoordinate] = useState({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const validateAddress = () => {
    const normalizedName = fullName.trim();
    const normalizedPhone = phone.trim();
    const normalizedStreet = street.trim();
    const normalizedCity = city.trim();
    const normalizedPincode = pincode.trim();

    if (
      !normalizedName ||
      !normalizedPhone ||
      !normalizedStreet ||
      !normalizedCity ||
      !normalizedPincode
    ) {
      return "Please fill all fields.";
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
          message: "We couldn't read the full address. Please fill the remaining details manually.",
        });
        return;
      }

      const streetParts = [
        result.name,
        result.street,
        result.district,
        result.subregion,
      ]
        .map((part) => String(part || "").trim())
        .filter(Boolean)
        .filter((part, index, parts) => parts.indexOf(part) === index);

      if (streetParts.length > 0) {
        setStreet(streetParts.join(", "));
      }

      const bestCity = result.city || result.subregion || result.region || "";
      if (bestCity) {
        setCity(bestCity);
      }

      if (result.postalCode) {
        setPincode(String(result.postalCode).replace(/\D/g, "").slice(0, 6));
      }

      showToast({
        type: "success",
        title: "Address updated",
        message: "Location details were added. You can fine-tune the extra details below.",
      });
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
          message: "Allow location access to auto-fill your address from the map.",
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
      const data = await apiRequest<{ success: boolean; address: any }>("/addresses", {
        method: "POST",
        body: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          street: [extraDetails.trim(), street.trim()].filter(Boolean).join(", "),
          city: city.trim(),
          pincode: pincode.trim(),
        },
      });

      const newAddress = data.address;
      const cached = await AsyncStorage.getItem(ADDRESSES_CACHE_KEY);
      const parsedCache = cached ? JSON.parse(cached) : [];
      const nextCache = [newAddress, ...parsedCache.filter((a: any) => a._id !== newAddress?._id)];
      await AsyncStorage.setItem(ADDRESSES_CACHE_KEY, JSON.stringify(nextCache));
      if (newAddress?._id) {
        await AsyncStorage.setItem(SELECTED_ADDRESS_ID_KEY, newAddress._id);
      }

      void triggerImpactHaptic();
      showToast({
        type: "success",
        title: "Address saved",
        message: "Your new pickup address is ready to use.",
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
            scrollEnabled={keyboardHeight > 0}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            contentContainerStyle={{
              paddingTop: insets.top + spacing.md,
              paddingHorizontal: spacing.lg,
              paddingBottom: 140 + insets.bottom + (keyboardHeight > 0 ? 24 : 0),
            }}
          >
            <Text style={[styles.title, { color: theme.text }]}>Add Address</Text>

            <Card style={[styles.sectionCard, styles.mapCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconWrap, { backgroundColor: theme.primarySoft }]}>
                  <Ionicons name="navigate-outline" size={18} color={theme.primary} />
                </View>
                <View style={styles.sectionHeaderText}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Pick on map</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
                    Give location access and we will auto-fill the main address like a delivery app.
                  </Text>
                </View>
              </View>

              <MapView
                style={styles.map}
                region={mapRegion}
                onPress={handleMapPress}
              >
                <Marker
                  coordinate={selectedCoordinate}
                  draggable
                  onDragEnd={(event) => {
                    const { latitude, longitude } = event.nativeEvent.coordinate;
                    void updateMapLocation(latitude, longitude);
                  }}
                />
              </MapView>

              <View style={styles.mapActions}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[styles.locationButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    void requestCurrentLocation();
                  }}
                >
                  <Ionicons name="locate-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.locationButtonText}>
                    {locationLoading ? "Locating..." : "Use Current Location"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.mapHint, { color: theme.textMuted }]}>
                Tap anywhere on the map or drag the pin to refine the address, then add flat or landmark details below.
              </Text>
            </Card>

            <Card style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconWrap, { backgroundColor: theme.primarySoft }]}>
                  <Ionicons name="location-outline" size={18} color={theme.primary} />
                </View>
                <View style={styles.sectionHeaderText}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Delivery Details</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
                    Add the address where our pickup partner should collect your clothes.
                  </Text>
                </View>
              </View>

              <FieldCard
                icon="person-outline"
                placeholder="Full Name"
                value={fullName}
                onChangeText={setFullName}
              />
              <FieldCard
                icon="call-outline"
                placeholder="Phone Number"
                value={phone}
                onChangeText={(value) => setPhone(value.replace(/\D/g, "").slice(0, 10))}
                keyboardType="phone-pad"
                maxLength={10}
              />
              <FieldCard
                icon="home-outline"
                placeholder="Street / House / Area"
                value={street}
                onChangeText={setStreet}
              />
              <FieldCard
                icon="albums-outline"
                placeholder="Flat / Landmark / Extra details"
                value={extraDetails}
                onChangeText={setExtraDetails}
              />
              <FieldCard
                icon="business-outline"
                placeholder="City"
                value={city}
                onChangeText={setCity}
              />
              <FieldCard
                icon="mail-outline"
                placeholder="Pincode"
                value={pincode}
                onChangeText={(value) => setPincode(value.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />
            </Card>
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
              title={saving ? "Saving..." : "Save Address"}
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
  title: {
    fontSize: 28,
    fontFamily: typography.bold,
    marginBottom: spacing.lg,
  },
  sectionCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  mapCard: {
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  sectionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: typography.semibold,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: typography.body,
  },
  inputCard: {
    marginBottom: spacing.sm + 2,
  },
  map: {
    height: 220,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  mapActions: {
    marginBottom: spacing.sm,
  },
  locationButton: {
    minHeight: 48,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  locationButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: typography.semibold,
  },
  mapHint: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: typography.body,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  button: {
    ...shadows.floating,
  },
});
