import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "../components/Card";
import DateChip from "../components/DateChip";
import TimeSlotCard from "../components/TimeSlotCard";
import { useAppTheme } from "../hooks/useAppTheme";
import { triggerImpactHaptic, triggerSelectionHaptic } from "../utils/haptics";

const formatDateValue = (date: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);

const dates = Array.from({ length: 4 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() + index);

  return {
    month: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(date).toUpperCase(),
    date: new Intl.DateTimeFormat("en-IN", { day: "2-digit" }).format(date),
    day: new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(date),
    value: formatDateValue(date),
  };
});

const slots = [
  { value: "9 AM - 12 PM", description: "Morning slot" },
  { value: "12 PM - 3 PM", description: "Afternoon slot" },
  { value: "3 PM - 6 PM", description: "Evening slot" },
];

export default function ScheduleBasic() {
  const router = useRouter();
  const { service, items } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const [selectedDate, setSelectedDate] = useState<string | null>(dates[0]?.value ?? null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.backgroundGlowTop, { backgroundColor: theme.primarySoft, opacity: isDark ? 0.22 : 0.9 }]} />
      <View style={[styles.backgroundGlowBottom, { backgroundColor: theme.primarySoft, opacity: isDark ? 0.14 : 0.5 }]} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.header, { color: theme.text }]}>Schedule Pickup</Text>
        <Text style={[styles.subheader, { color: theme.textMuted }]}>
          Choose a pickup date and time slot that works best for your order.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Date</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateRow}
        >
          {dates.map((date) => (
            <DateChip
              key={date.value}
              month={date.month}
              date={date.date}
              day={date.day}
              selected={selectedDate === date.value}
              onPress={() => {
                void triggerSelectionHaptic();
                setSelectedDate(date.value);
              }}
            />
          ))}
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Time Slot</Text>
        {slots.map((slot) => (
          <TimeSlotCard
            key={slot.value}
            slot={slot.value}
            description={slot.description}
            selected={selectedSlot === slot.value}
            onPress={() => {
              void triggerSelectionHaptic();
              setSelectedSlot(slot.value);
            }}
          />
        ))}

        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={[styles.summaryIconWrap, { backgroundColor: theme.primarySoft }]}>
              <MaterialIcons name="schedule" size={18} color={theme.primary} />
            </View>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Pickup Summary</Text>
          </View>
          <Text style={[styles.summaryValue, { color: theme.text }]}>
            {selectedDate && selectedSlot
              ? `${selectedDate} - ${selectedSlot}`
              : "Choose a date and slot to continue"}
          </Text>
          <Text style={[styles.summaryHelper, { color: theme.textMuted }]}>
            Your garments will be collected from the selected address in this time window.
          </Text>
        </Card>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 18, backgroundColor: theme.glass }]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            { backgroundColor: theme.primary },
            (!selectedDate || !selectedSlot) && styles.continueButtonDisabled,
          ]}
          disabled={!selectedDate || !selectedSlot}
          activeOpacity={0.9}
          onPress={() => {
            void triggerImpactHaptic();
            router.push({
              pathname: "/select-address",
              params: {
                service,
                items,
                date: selectedDate,
                slot: selectedSlot,
              },
            });
          }}
        >
          <Text style={styles.continueText}>Continue</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -90,
    right: -36,
    width: 210,
    height: 210,
    borderRadius: 105,
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: 110,
    left: -70,
    width: 190,
    height: 190,
    borderRadius: 95,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subheader: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
  },
  dateRow: {
    paddingBottom: 8,
    marginBottom: 22,
  },
  summaryCard: {
    marginTop: 10,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  summaryHelper: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  continueButton: {
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  continueButtonDisabled: {
    opacity: 0.45,
  },
  continueText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
