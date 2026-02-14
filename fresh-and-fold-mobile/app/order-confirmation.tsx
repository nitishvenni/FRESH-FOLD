import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function OrderConfirmation() {
  const router = useRouter();
 const { total, date, slot, orderId } = useLocalSearchParams();


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order Confirmed</Text>

      <Text style={styles.subtitle}>
        Your pickup is scheduled on
      </Text>

      <Text style={styles.details}>
        {date} · {slot}
      </Text>

      <Text style={styles.total}>
        Total Paid: ₹{total}
      </Text>

      <TouchableOpacity
        style={styles.button}
      onPress={() =>
  router.replace({
    pathname: "/track-order",
    params: { orderId },
  })
}


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
    paddingTop: 120,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
  },
  subtitle: {
    color: "#666",
    marginBottom: 6,
  },
  details: {
    fontWeight: "600",
    marginBottom: 20,
  },
  total: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "600",
  },
});
