import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "../context/AuthContext";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";


export default function HomeScreen() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();
const [activeOrder, setActiveOrder] = useState<any>(null);
const [loading, setLoading] = useState(true);
useEffect(() => {
  fetchOrders();
}, []);

const fetchOrders = async () => {
  try {
    const token = await AsyncStorage.getItem("token");

    const response = await fetch("http://10.0.2.2:4000/orders", {
      headers: {
        Authorization: token || "",
      },
    });

    const data = await response.json();

    if (data.success && data.orders.length > 0) {
      const latest = data.orders[0];

      if (latest.status !== "Delivered") {
        setActiveOrder(latest);
      }
    }
  } catch (error) {
    console.log("Error fetching orders");
  } finally {
    setLoading(false);
  }
};

  if (!isLoggedIn) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.brand}>Fresh & Fold</Text>

      {/* Main Card */}
      <View style={styles.card}>
     {loading ? (
  <Text>Loading...</Text>
) : activeOrder ? (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>Active Order</Text>
    <Text style={styles.cardSubtitle}>
      Status: {activeOrder.status}
    </Text>
<TouchableOpacity
  style={{
    marginTop: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 8,
    alignItems: "center",
  }}
  onPress={() => router.push("/order-history")}
>
  <Text style={{ fontWeight: "600" }}>
    View Order History
  </Text>
</TouchableOpacity>

    <TouchableOpacity
      style={styles.primaryButton}
      onPress={() =>
        router.push({
          pathname: "/track-order",
          params: { orderId: activeOrder._id },
        })
      }
    >
      <Text style={styles.primaryButtonText}>
        Track Order
      </Text>
    </TouchableOpacity>
  </View>
) : (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>No Active Orders</Text>
    <Text style={styles.cardSubtitle}>
      Schedule your laundry pickup in seconds.
    </Text>

    <TouchableOpacity
      style={styles.primaryButton}
      onPress={() => router.push("/select-service")}
    >
      <Text style={styles.primaryButtonText}>
        Schedule Pickup
      </Text>
    </TouchableOpacity>
  </View>
)}

        <Text style={styles.cardSubtitle}>
          Schedule your laundry pickup in seconds.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/select-service")}

        >
          <Text style={styles.primaryButtonText}>Schedule Pickup</Text>
        </TouchableOpacity>
      </View>

      {/* Secondary Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Why Fresh & Fold?</Text>
        <Text style={styles.infoText}>
          Premium laundry service with doorstep pickup, careful handling, and
          on-time delivery.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  brand: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: "#000000",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  infoSection: {
    marginTop: 40,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
});
