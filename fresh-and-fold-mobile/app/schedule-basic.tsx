import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateChip from "../components/DateChip";
import TimeSlotCard from "../components/TimeSlotCard";
import { useAppTheme } from "../hooks/useAppTheme";
import { triggerImpactHaptic, triggerSelectionHaptic } from "../utils/haptics";
import { getBookingDateOptions, isPickupSlot, PICKUP_SLOTS } from "../utils/bookingSchedule";

export default function ScheduleBasic() {
  const router = useRouter();
  const { cleaningService, speed, items, suggestedPickupDate, suggestedPickupSlot } = useLocalSearchParams<{
    cleaningService?: string; speed?: string; items?: string; suggestedPickupDate?: string; suggestedPickupSlot?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const dates = useMemo(() => getBookingDateOptions(), []);
  const [selectedDate, setSelectedDate] = useState<string | null>(() =>
    typeof suggestedPickupDate === "string"
      ? dates.find((date) => date.isoDate === suggestedPickupDate)?.value ?? null
      : null
  );
  const [selectedSlot, setSelectedSlot] = useState<string | null>(() =>
    isPickupSlot(suggestedPickupSlot) ? suggestedPickupSlot : null
  );

  const canContinue = !!selectedDate && !!selectedSlot;

  const handleContinue = () => {
    if (!canContinue) return;
    void triggerImpactHaptic();
    router.push({
      pathname: "/select-address",
      params: {
        cleaningService,
        speed,
        items,
        date: selectedDate,
        slot: selectedSlot,
      },
    });
  };

  // Dynamic Summary Text
  let summaryTitle = "Choose a date and time";
  let summarySubtitle = "Select your preferred pickup window. You'll choose the pickup address in the next step.";
  if (selectedDate && !selectedSlot) {
    summaryTitle = selectedDate;
    summarySubtitle = "Now choose your preferred time slot.";
  } else if (selectedDate && selectedSlot) {
    summaryTitle = `${selectedDate} · ${selectedSlot}`;
    summarySubtitle = "You'll choose the pickup address in the next step.";
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Subtle Atmospheric Background */}
      <View
        style={[
          styles.backgroundGlowTop,
          { backgroundColor: theme.primarySoft, opacity: isDark ? 0.15 : 0.6 },
        ]}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top, paddingHorizontal: 20 },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Schedule Pickup</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 120, // Enough padding so CTA doesn't cover last slot
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.subheader, { color: theme.textMuted }]}>
            Choose a convenient pickup date and time.
          </Text>

          {/* Dynamic Summary Card */}
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: isDark ? "rgba(17,24,39,0.4)" : "rgba(255,255,255,0.7)",
                borderColor: isDark ? "rgba(148,163,184,0.15)" : "rgba(255,255,255,0.9)",
              },
            ]}
          >
            <View style={styles.summaryIconWrap}>
              <View style={[styles.summaryIconBg, { backgroundColor: theme.primarySoft }]} />
              <MaterialIcons name="schedule" size={18} color={theme.primary} />
            </View>
            <View style={styles.summaryTextWrap}>
              <Text style={[styles.summaryTitle, { color: theme.text }]}>{summaryTitle}</Text>
              <Text style={[styles.summarySubtitle, { color: theme.textMuted }]}>
                {summarySubtitle}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
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
                  // Optionally reset slot when date changes if required by business logic, 
                  // but existing logic doesn't strictly enforce it, we just keep it smooth.
                }}
              />
            ))}
          </ScrollView>
        </View>

        <View style={[styles.section, styles.timeSlotSection]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Time Slot</Text>
          {PICKUP_SLOTS.map((slot) => (
            <TimeSlotCard
              key={slot.value}
              slot={slot.value}
              description={slot.description}
              selected={selectedSlot === slot.value}
              onPress={() => {
                void triggerSelectionHaptic();
                setSelectedSlot(slot.value);
                // If date isn't selected, auto-select the first available date for convenience
                if (!selectedDate) {
                  setSelectedDate(dates[0].value);
                }
              }}
            />
          ))}
        </View>
      </ScrollView>

      {/* Floating Bottom Summary */}
      <View style={[styles.bottomBarWrap, { paddingBottom: insets.bottom || 20 }]}>
        <BlurView
          intensity={isDark ? 26 : 40}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={[
            styles.bottomBarBorder,
            {
              backgroundColor: isDark ? "rgba(17,24,39,0.5)" : "rgba(255,255,255,0.4)",
              borderTopColor: isDark ? "rgba(148,163,184,0.15)" : "rgba(255,255,255,0.7)",
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleContinue}
            disabled={!canContinue}
            style={[
              styles.continueBtn,
              { backgroundColor: theme.primary },
              !canContinue && { opacity: 0.4 },
            ]}
          >
            <Text style={styles.continueText}>Continue</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -100,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  backButtonPlaceholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  subheader: {
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  timeSlotSection: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  summaryCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  summaryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    position: "relative",
  },
  summaryIconBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    opacity: 0.4, // Keep the soft tint extremely subtle
  },
  summaryTextWrap: {
    flex: 1,
    justifyContent: "center",
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  dateRow: {
    paddingRight: 20, // allows last item to scroll cleanly
  },
  bottomBarWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  bottomBarBorder: {
    borderTopWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 26,
    gap: 8,
  },
  continueText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
