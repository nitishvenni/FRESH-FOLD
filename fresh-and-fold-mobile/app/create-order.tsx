import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { apiRequest } from "../utils/api";
import { handleError } from "../utils/errorHandler";

export default function CreateOrder() {
  const router = useRouter();
  const [shirtQty, setShirtQty] = useState("0");
  const [pantQty, setPantQty] = useState("0");
  const [loading, setLoading] = useState(false);

  const placeOrder = async () => {
    try {
      setLoading(true);

      const addressId = "PASTE_YOUR_ADDRESS_ID_HERE";
      const items = [
        {
          itemName: "Shirt",
          quantity: Number(shirtQty),
          price: 20,
        },
        {
          itemName: "Pant",
          quantity: Number(pantQty),
          price: 30,
        },
      ];

      const data = await apiRequest<{ success: boolean }>("/orders", {
        method: "POST",
        body: {
          addressId,
          items,
        },
      });

      if (data.success) {
        Alert.alert("Success", "Order placed successfully!");
        router.replace("/home");
      }
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Order</Text>

      <Text>Shirts (Rs.20 each)</Text>
      <TextInput
        keyboardType="number-pad"
        value={shirtQty}
        onChangeText={setShirtQty}
        style={styles.input}
      />

      <Text>Pants (Rs.30 each)</Text>
      <TextInput
        keyboardType="number-pad"
        value={pantQty}
        onChangeText={setPantQty}
        style={styles.input}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={placeOrder}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Placing..." : "Place Order"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20 },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "black",
    padding: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: { color: "white", fontWeight: "600" },
});
