import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function OrderHistory() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
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
        setOrders(data.orders);
      }
    } catch (error) {
      console.log("Error fetching orders");
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

  if (orders.length === 0) {
    return (
      <View style={styles.loader}>
        <Text>No Orders Yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Order History</Text>

      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/track-order",
                params: { orderId: item._id },
              })
            }
          >
            <Text style={styles.orderId}>
              Order #{item._id.slice(-6)}
            </Text>

            <Text style={styles.status}>
              Status: {item.status}
            </Text>

            <Text style={styles.total}>
              ₹{item.totalAmount}
            </Text>

            <Text style={styles.date}>
              {new Date(item.createdAt).toDateString()}
            </Text>
          </TouchableOpacity>
        )}
      />
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
  card: {
    borderWidth: 1,
    borderColor: "#EAEAEA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  orderId: {
    fontWeight: "700",
    marginBottom: 6,
  },
  status: {
    color: "#666",
    marginBottom: 4,
  },
  total: {
    fontWeight: "600",
    marginBottom: 4,
  },
  date: {
    color: "#999",
    fontSize: 12,
  },
});
