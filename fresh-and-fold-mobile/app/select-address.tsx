import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SelectAddress() {
  const router = useRouter();
  const { service, items, date, slot, total } = useLocalSearchParams();

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await fetch("http://10.0.2.2:4000/addresses", {
        headers: {
          Authorization: token || "",
        },
      });

      const data = await response.json();

      if (data.success) {
        setAddresses(data.addresses || []);
      } else {
        Alert.alert("Error", "Failed to load addresses");
      }
    } catch (error) {
      Alert.alert("Error", "Network error");
    } finally {
      setLoading(false);
    }
  };
const selectedAddress = addresses.find(
  (addr) => addr._id === selected
);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Select Address</Text>

      {addresses.map((address) => (
        <TouchableOpacity
          key={address._id}
          style={[
            styles.card,
            selected === address._id && styles.selectedCard,
          ]}
          onPress={() => setSelected(address._id)}
        >
          <Text style={styles.name}>{address.fullName}</Text>
          <Text style={styles.details}>
            {address.street}, {address.city} - {address.pincode}
          </Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[
          styles.continueButton,
          !selected && { opacity: 0.4 },
        ]}
        disabled={!selected}
        onPress={() =>
          router.push({
  pathname: "/payment",
  params: {
    service,
    items,
    date,
    slot,
    addressId: selectedAddress?._id,
    addressName: selectedAddress?.fullName,
  },
})   }
      >
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 24,
    paddingTop: 80,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 30,
  },
  card: {
    borderWidth: 1,
    borderColor: "#EAEAEA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  selectedCard: {
    borderColor: "#000",
  },
  name: {
    fontWeight: "600",
    marginBottom: 4,
  },
  details: {
    color: "#666",
  },
  continueButton: {
    marginTop: "auto",
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  continueText: {
    color: "#FFF",
    fontWeight: "600",
  },
});
