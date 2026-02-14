import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useState, useEffect } from "react";

import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Payment() {
  const router = useRouter();
  const {
    service,
    items,
    date,
    slot,
    addressId,
    addressName,
    total,
  } = useLocalSearchParams();
const [backendTotal, setBackendTotal] = useState<number>(0);
const [loadingTotal, setLoadingTotal] = useState(true);

  const parsedItems = items ? JSON.parse(items as string) : {};
  const [method, setMethod] = useState<string | null>(null);
useEffect(() => {
  fetchPreview();
}, []);

const fetchPreview = async () => {
  try {
    const token = await AsyncStorage.getItem("token");

    const orderItems = Object.keys(parsedItems)
      .filter((key) => parsedItems[key] > 0)
      .map((key) => ({
        itemName: key,
        quantity: parsedItems[key],
      }));

    const response = await fetch(
      "http://10.0.2.2:4000/orders/preview",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token || "",
        },
        body: JSON.stringify({
          items: orderItems,
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      setBackendTotal(data.totalAmount);
    }
  } catch (error) {
    console.log("Preview failed");
  } finally {
    setLoadingTotal(false);
  }
};

  const totalItems = Object.values(parsedItems).reduce(
    (sum: number, qty: any) => sum + Number(qty),
    0
  );

  const confirmOrder = async () => {
    if (!method) {
      Alert.alert("Select Payment Method");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");

      const orderItems = Object.keys(parsedItems)
        .filter((key) => parsedItems[key] > 0)
        .map((key) => ({
          itemName: key,
          quantity: parsedItems[key],
        }));

      const response = await fetch(
        "http://10.0.2.2:4000/orders",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token || "",
          },
          body: JSON.stringify({
            addressId,
            items: orderItems,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        router.replace({
          pathname: "/order-confirmation",
          params: {
            orderId: data.order._id,
            total: data.order.totalAmount,
          },
        });
      } else {
        Alert.alert("Order failed");
      }
    } catch (error) {
      Alert.alert("Network error");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Payment</Text>

        {/* ORDER SUMMARY CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>

          <View style={styles.row}>
            <Text>Service</Text>
            <Text style={styles.bold}>{service}</Text>
          </View>

          <View style={styles.row}>
            <Text>Items</Text>
            <Text style={styles.bold}>
              {totalItems} pieces
            </Text>
          </View>

          <View style={styles.row}>
            <Text>Pickup</Text>
            <Text style={styles.bold}>
              {date} · {slot}
            </Text>
          </View>

          <View style={styles.row}>
            <Text>Address</Text>
            <Text style={styles.bold}>
              {addressName}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>
              ₹{backendTotal}

            </Text>
          </View>
        </View>

        {/* PAYMENT METHODS */}
        <Text style={styles.sectionTitle}>
          Payment Method
        </Text>

        <TouchableOpacity
          style={[
            styles.methodCard,
            method === "paynow" && styles.selected,
          ]}
          onPress={() => setMethod("paynow")}
        >
          <Text style={styles.methodTitle}>
            Pay Now
          </Text>
          <Text style={styles.methodSubtitle}>
            UPI, Card, Net Banking
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.methodCard,
            method === "cod" && styles.selected,
          ]}
          onPress={() => setMethod("cod")}
        >
          <Text style={styles.methodTitle}>
            Pay After Delivery
          </Text>
          <Text style={styles.methodSubtitle}>
            Pay when clothes are delivered
          </Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* STICKY BUTTON */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          disabled={!method}
          style={[
            styles.placeButton,
            !method && { opacity: 0.4 },
          ]}
          onPress={confirmOrder}
        >
          <Text style={styles.placeText}>
            Place Order · ₹{backendTotal}

          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    fontSize: 22,
    fontWeight: "700",
    padding: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 12,
    marginHorizontal: 24,
    padding: 16,
    marginBottom: 30,
  },
  cardTitle: {
    fontWeight: "700",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  bold: { fontWeight: "600" },
  divider: {
    height: 1,
    backgroundColor: "#EEE",
    marginVertical: 12,
  },
  totalLabel: { fontWeight: "700" },
  totalAmount: { fontWeight: "700", fontSize: 16 },
  sectionTitle: {
    marginHorizontal: 24,
    fontWeight: "600",
    marginBottom: 12,
  },
  methodCard: {
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 12,
    marginHorizontal: 24,
    padding: 16,
    marginBottom: 16,
  },
  selected: { borderColor: "#000" },
  methodTitle: { fontWeight: "600" },
  methodSubtitle: { fontSize: 12, color: "#666" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#EEE",
    backgroundColor: "#FFF",
  },
  placeButton: {
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  placeText: { color: "#FFF", fontWeight: "600" },
});
