import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useLocalSearchParams } from "expo-router";


export default function ScheduleBasic() {
  const router = useRouter();
    const { service, items } = useLocalSearchParams();

  const parsedItems = items ? JSON.parse(items as string) : {};
  console.log("Service:", service);
console.log("Items:", parsedItems);


  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const dates = ["Today", "Tomorrow", "Fri", "Sat"];
  const slots = ["9AM – 12PM", "12PM – 3PM", "3PM – 6PM"];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Schedule Pickup</Text>

      <Text style={styles.sectionTitle}>Select Date</Text>
      <View style={styles.row}>
        {dates.map((date) => (
          <TouchableOpacity
            key={date}
            style={[
              styles.option,
              selectedDate === date && styles.selected,
            ]}
            onPress={() => setSelectedDate(date)}
          >
            <Text style={styles.optionText}>{date}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Select Time Slot</Text>
      {slots.map((slot) => (
        <TouchableOpacity
          key={slot}
          style={[
            styles.slot,
            selectedSlot === slot && styles.selected,
          ]}
          onPress={() => setSelectedSlot(slot)}
        >
          <Text style={styles.optionText}>{slot}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[
          styles.continueButton,
          (!selectedDate || !selectedSlot) && { opacity: 0.4 },
        ]}
        disabled={!selectedDate || !selectedSlot}
       onPress={() =>
router.push({
  pathname: "/select-address",
  params: {
    service,
    items,
    date: selectedDate,
    slot: selectedSlot,
  },
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
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 10,
    color: "#666",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  option: {
    borderWidth: 1,
    borderColor: "#EAEAEA",
    padding: 10,
    borderRadius: 8,
  },
  slot: {
    borderWidth: 1,
    borderColor: "#EAEAEA",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  selected: {
    borderColor: "#000000",
  },
  optionText: {
    fontSize: 14,
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
