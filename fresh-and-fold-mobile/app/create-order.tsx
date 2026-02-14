import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useLocalSearchParams } from "expo-router";


export default function CreateOrder() {
  const router = useRouter();
  const { service, items, date, slot } = useLocalSearchParams();

const parsedItems = items ? JSON.parse(items as string) : {};
console.log("Final Service:", service);
console.log("Final Items:", parsedItems);
console.log("Date:", date);
console.log("Slot:", slot);


  const [shirtQty, setShirtQty] = useState("0");
  const [pantQty, setPantQty] = useState("0");

  const placeOrder = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Error", "Not authenticated");
        return;
      }

      // 🔹 TEMP: Replace with real addressId from Postman
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

      const response = await fetch("http://10.0.2.2:4000/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          addressId,
          items,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Success", "Order placed successfully!");
        router.replace("/home");
      } else {
        Alert.alert("Error", "Order failed");
      }
    } catch (error) {
      Alert.alert("Error", "Network error");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Order</Text>

      <Text>Shirts (₹20 each)</Text>
      <TextInput
        keyboardType="number-pad"
        value={shirtQty}
        onChangeText={setShirtQty}
        style={styles.input}
      />

      <Text>Pants (₹30 each)</Text>
      <TextInput
        keyboardType="number-pad"
        value={pantQty}
        onChangeText={setPantQty}
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={placeOrder}>
        <Text style={styles.buttonText}>Place Order</Text>
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
  buttonText: { color: "white", fontWeight: "600" },
});
