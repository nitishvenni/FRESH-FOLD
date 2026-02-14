import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";

export default function SelectService() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const services = [
    { id: "wash", title: "Wash & Iron", subtitle: "Everyday laundry care" },
    { id: "dry", title: "Dry Clean", subtitle: "Delicate garment treatment" },
    { id: "express", title: "Express", subtitle: "Faster turnaround service" },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Select Service</Text>

      {services.map((service) => (
        <TouchableOpacity
          key={service.id}
          style={[
            styles.card,
            selected === service.id && styles.selectedCard,
          ]}
          onPress={() => setSelected(service.id)}
        >
          <Text style={styles.cardTitle}>{service.title}</Text>
          <Text style={styles.cardSubtitle}>{service.subtitle}</Text>
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
    pathname: "/select-items",
    params: { service: selected },
  })
}


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
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 30,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    marginBottom: 16,
  },
  selectedCard: {
    borderColor: "#000000",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#666666",
  },
  continueButton: {
    marginTop: "auto",
    backgroundColor: "#000000",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  continueText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
