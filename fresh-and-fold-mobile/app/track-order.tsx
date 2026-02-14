import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function TrackOrder() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const steps = [
    "Scheduled",
    "Picked Up",
    "Washing",
    "Out for Delivery",
    "Delivered",
  ];

  useEffect(() => {
    fetchOrder();
  }, []);

  const fetchOrder = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await fetch(
        "http://10.0.2.2:4000/orders",
        {
          headers: {
            Authorization: token || "",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        const found = data.orders.find(
          (o: any) => o._id === orderId
        );
        setOrder(found);
      }
    } catch (error) {
      console.log("Error fetching order");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loader}>
        <Text>Order not found</Text>
      </View>
    );
  }

  const currentStepIndex = steps.indexOf(order.status);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Track Order</Text>

      <Text style={styles.orderId}>
        Order ID: {order._id.slice(-6)}
      </Text>

      {steps.map((step, index) => (
        <View key={step} style={styles.stepRow}>
          <View
            style={[
              styles.circle,
              index <= currentStepIndex && styles.activeCircle,
            ]}
          />
          <Text
            style={[
              styles.stepText,
              index <= currentStepIndex && styles.activeText,
            ]}
          >
            {step}
          </Text>
        </View>
      ))}

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace("/home")}
      >
        <Text style={styles.buttonText}>
          Back to Home
        </Text>
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
    marginBottom: 20,
  },
  orderId: {
    marginBottom: 30,
    color: "#666",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  circle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#EAEAEA",
    marginRight: 12,
  },
  activeCircle: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  stepText: {
    fontSize: 14,
    color: "#999",
  },
  activeText: {
    color: "#000",
    fontWeight: "600",
  },
  button: {
    marginTop: "auto",
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "600",
  },
});
