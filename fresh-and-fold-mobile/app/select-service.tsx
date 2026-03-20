import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ServiceCard from "../components/ServiceCard";
import Card from "../components/Card";
import { useAppTheme } from "../hooks/useAppTheme";

type ServiceId = "wash" | "dry" | "express";

const services: Array<{
  id: ServiceId;
  title: string;
  description: string;
  meta: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  estimate: string;
}> = [
  {
    id: "wash",
    title: "Wash & Iron",
    description: "Everyday laundry care",
    meta: "24 hour delivery",
    icon: "local-laundry-service",
    estimate: "Tomorrow evening",
  },
  {
    id: "dry",
    title: "Dry Clean",
    description: "Delicate garments",
    meta: "Professional cleaning",
    icon: "dry-cleaning",
    estimate: "Within 2 days",
  },
  {
    id: "express",
    title: "Express",
    description: "Same day delivery",
    meta: "Priority processing",
    icon: "bolt",
    estimate: "Today by 9 PM",
  },
];

export default function SelectService() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const [selected, setSelected] = useState<ServiceId | null>(null);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selected) ?? null,
    [selected]
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.backgroundGlowTop, { backgroundColor: theme.primarySoft, opacity: isDark ? 0.22 : 0.9 }]} />
      <View style={[styles.backgroundGlowBottom, { backgroundColor: theme.primarySoft, opacity: isDark ? 0.14 : 0.5 }]} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 132,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.header, { color: theme.text }]}>Select Service</Text>
        <Text style={[styles.subheader, { color: theme.textMuted }]}>
          Choose the laundry experience that fits your garments and delivery speed.
        </Text>

        <View style={styles.cardsWrap}>
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              title={service.title}
              description={service.description}
              meta={service.meta}
              icon={service.icon}
              selected={selected === service.id}
              variant="selection"
              onPress={() => setSelected(service.id)}
            />
          ))}
        </View>

        <Card style={styles.estimateCard}>
          <View style={styles.estimateHeader}>
            <View style={[styles.estimateIconWrap, { backgroundColor: theme.primarySoft }]}>
              <MaterialIcons name="schedule" size={18} color={theme.primary} />
            </View>
            <Text style={[styles.estimateLabel, { color: theme.textMuted }]}>Estimated delivery</Text>
          </View>

          <Text style={[styles.estimateValue, { color: theme.text }]}>
            {selectedService?.estimate ?? "Select a service to see delivery timing"}
          </Text>
          <Text style={[styles.estimateHelper, { color: theme.textMuted }]}>
            {selectedService
              ? `${selectedService.title} includes ${selectedService.meta.toLowerCase()}.`
              : "Premium handling, live updates, and doorstep convenience are included."}
          </Text>
        </Card>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 18, backgroundColor: theme.glass }]}>
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: theme.primary, shadowColor: theme.primary }, !selected && styles.continueButtonDisabled]}
          disabled={!selected}
          activeOpacity={0.9}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -80,
    right: -36,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: 120,
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
  cardsWrap: {
    marginBottom: 10,
  },
  estimateCard: {
    borderRadius: 24,
    padding: 20,
  },
  estimateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  estimateIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  estimateLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  estimateValue: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  estimateHelper: {
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
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  continueButtonDisabled: {
    opacity: 0.45,
  },
  continueText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
