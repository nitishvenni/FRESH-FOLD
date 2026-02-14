import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";

export default function SchedulePremium() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const options = [
    { id: "today-morning", label: "Today · 9AM – 12PM" },
    { id: "today-afternoon", label: "Today · 12PM – 3PM" },
    { id: "tomorrow-morning", label: "Tomorrow · 9AM – 12PM" },
    { id: "tomorrow-afternoon", label: "Tomorrow · 12PM – 3PM" },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Choose Pickup Slot</Text>

      {options.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.card,
            selected === option.id && styles.selectedCard,
          ]}
          onPress={() => setSelected(option.id)}
        >
          <Text style={styles.cardText}>{option.label}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[
          styles.button,
          !selected && { opacity: 0.4 },
        ]}
        disabled={!selected}
        onPress={() => router.push("/create-order")}
      >
        <Text style={styles.buttonText}>Confirm Pickup</Text>
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
  header: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 30,
  },
  card: {
    borderWidth: 1,
    borderColor: "#EAEAEA",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  selectedCard: {
    borderColor: "#000",
  },
  cardText: {
    fontSize: 15,
  },
  button: {
    marginTop: "auto",
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "600",
  },
});
