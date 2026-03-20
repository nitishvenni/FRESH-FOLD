import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Card from "../components/Card";
import ItemCard from "../components/ItemCard";
import { useAppTheme } from "../hooks/useAppTheme";

type ItemKey =
  | "shirt"
  | "tshirt"
  | "jeans"
  | "trousers"
  | "dress"
  | "jacket"
  | "sweater"
  | "bedsheet"
  | "pillowcover"
  | "towel"
  | "curtain"
  | "blanket";

type ItemState = Record<ItemKey, number>;

const pricing: Record<ItemKey, number> = {
  shirt: 30,
  tshirt: 25,
  jeans: 60,
  trousers: 45,
  dress: 90,
  jacket: 140,
  sweater: 70,
  bedsheet: 120,
  pillowcover: 35,
  towel: 40,
  curtain: 180,
  blanket: 220,
};

const clothingItems: Array<{
  key: ItemKey;
  name: string;
}> = [
  { key: "shirt", name: "Shirt" },
  { key: "tshirt", name: "T-Shirt" },
  { key: "jeans", name: "Jeans" },
  { key: "trousers", name: "Trousers" },
  { key: "dress", name: "Dress" },
  { key: "jacket", name: "Jacket" },
  { key: "sweater", name: "Sweater" },
];

const homeItems: Array<{
  key: ItemKey;
  name: string;
}> = [
  { key: "bedsheet", name: "Bedsheet" },
  { key: "pillowcover", name: "Pillow Cover" },
  { key: "towel", name: "Towel" },
  { key: "curtain", name: "Curtain" },
  { key: "blanket", name: "Blanket" },
];

const initialItems = Object.keys(pricing).reduce((acc, key) => {
  acc[key as ItemKey] = 0;
  return acc;
}, {} as ItemState);

export default function SelectItems() {
  const router = useRouter();
  const { service } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const [items, setItems] = useState<ItemState>(initialItems);

  const updateQty = (key: ItemKey, delta: number) => {
    setItems((prev) => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta),
    }));
  };

  const totalItems = Object.values(items).reduce((sum, qty) => sum + qty, 0);
  const totalAmount = (Object.keys(items) as ItemKey[]).reduce(
    (sum, key) => sum + items[key] * pricing[key],
    0
  );

  const renderSection = (
    title: string,
    subtitle: string,
    list: Array<{
      key: ItemKey;
      name: string;
    }>
  ) => (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
        </View>

      {list.map((item, index) => (
        <ItemCard
          key={item.key}
          item={{
            key: item.key,
            name: item.name,
            price: pricing[item.key],
          }}
          quantity={items[item.key]}
          onAdd={() => updateQty(item.key, 1)}
          onRemove={() => updateQty(item.key, -1)}
          index={index}
        />
      ))}
    </View>
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
        <Text style={[styles.header, { color: theme.text }]}>Select Items</Text>
        <Text style={[styles.subheader, { color: theme.textMuted }]}>
          Add the garments and household pieces you want us to clean, press, or deliver.
        </Text>

        <Card style={styles.infoCard}>
          <View style={[styles.infoIconWrap, { backgroundColor: theme.primarySoft }]}>
            <MaterialIcons name="inventory-2" size={18} color={theme.primary} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={[styles.infoTitle, { color: theme.textMuted }]}>Service selected</Text>
            <Text style={[styles.infoText, { color: theme.text }]}>
              {String(service || "Laundry").replace(/^\w/, (char) => char.toUpperCase())}
            </Text>
          </View>
        </Card>

        {renderSection("Clothing", "Daily wear and delicate garments", clothingItems)}
        {renderSection("Home & Linen", "Large household fabrics and essentials", homeItems)}
      </ScrollView>

      <Animated.View
        entering={FadeIn.duration(250)}
        style={[styles.bottomBar, { paddingBottom: insets.bottom + 18, borderColor: theme.border, backgroundColor: theme.glass }]}
      >
        <View>
          <Text style={[styles.totalItems, { color: theme.textMuted }]}>{totalItems} items</Text>
          <Text style={[styles.totalAmount, { color: theme.text }]}>Rs.{totalAmount}</Text>
        </View>

        <TouchableOpacity
          disabled={totalItems === 0}
          style={[styles.continueButton, { backgroundColor: theme.text }, totalItems === 0 && styles.continueButtonDisabled]}
          activeOpacity={0.9}
          onPress={() =>
            router.push({
              pathname: "/schedule-basic",
              params: {
                service,
                items: JSON.stringify(items),
                total: totalAmount,
              },
            })
          }
        >
          <Text style={styles.continueText}>Continue</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -70,
    right: -40,
    width: 210,
    height: 210,
    borderRadius: 105,
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: 90,
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
    marginBottom: 20,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  infoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoCopy: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 16,
    fontWeight: "700",
  },
  section: {
    marginBottom: 10,
  },
  sectionHeader: {
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalItems: {
    fontSize: 13,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: "700",
  },
  continueButton: {
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 118,
  },
  continueButtonDisabled: {
    opacity: 0.45,
  },
  continueText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
