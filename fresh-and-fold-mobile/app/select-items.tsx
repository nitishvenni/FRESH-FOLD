import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function SelectItems() {
  const router = useRouter();
  const { service } = useLocalSearchParams();

const pricing: Record<string, number> = {
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

  const clothingItems = [
    { key: "shirt", label: "👔 Shirt" },
    { key: "tshirt", label: "👕 T-Shirt" },
    { key: "jeans", label: "👖 Jeans" },
    { key: "trousers", label: "👔 Trousers" },
    { key: "dress", label: "👗 Dress" },
    { key: "jacket", label: "🧥 Jacket" },
    { key: "sweater", label: "🧶 Sweater" },
  ];

  const homeItems = [
    { key: "bedsheet", label: "🛏️ Bedsheet" },
    { key: "pillowcover", label: "🛋️ Pillow Cover" },
    { key: "towel", label: "🧺 Towel" },
    { key: "curtain", label: "🪟 Curtain" },
    { key: "blanket", label: "🛌 Blanket" },
  ];

  const [items, setItems] = useState(
    Object.keys(pricing).reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {} as any)
  );

  const updateQty = (key: string, delta: number) => {
    setItems((prev: any) => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta),
    }));
  };

  const totalItems = Object.values(items).reduce(
    (sum: number, qty: any) => sum + qty,
    0
  );

  const totalAmount = Object.keys(items).reduce(
    (sum, key) => sum + items[key] * pricing[key],
    0
  );

  const renderSection = (title: string, list: any[]) => (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      {list.map((item) => (
        <View key={item.key} style={styles.row}>
          <View>
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Text style={styles.price}>
              ₹{pricing[item.key]}
            </Text>
          </View>

          <View style={styles.counter}>
            <TouchableOpacity
              onPress={() => updateQty(item.key, -1)}
              style={styles.counterButton}
            >
              <Text style={styles.counterText}>−</Text>
            </TouchableOpacity>

            <Text style={styles.countValue}>
              {items[item.key]}
            </Text>

            <TouchableOpacity
              onPress={() => updateQty(item.key, 1)}
              style={styles.counterButton}
            >
              <Text style={styles.counterText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Select Items</Text>

        {renderSection("Clothing", clothingItems)}
        {renderSection("Home & Linen", homeItems)}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalItems}>
            {totalItems} items
          </Text>
          <Text style={styles.totalAmount}>
            ₹{totalAmount}
          </Text>
        </View>

        <TouchableOpacity
          disabled={totalItems === 0}
          style={[
            styles.continueButton,
            totalItems === 0 && { opacity: 0.4 },
          ]}
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
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    fontSize: 22,
    fontWeight: "700",
    padding: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 24,
    marginTop: 10,
    marginBottom: 10,
    color: "#666",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  itemLabel: { fontSize: 14, fontWeight: "500" },
  price: { fontSize: 12, color: "#666" },
  counter: { flexDirection: "row", alignItems: "center" },
  counterButton: {
    borderWidth: 1,
    borderColor: "#000",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  counterText: { fontWeight: "600" },
  countValue: { marginHorizontal: 12 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#EEE",
    backgroundColor: "#FFF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalItems: { fontSize: 12, color: "#666" },
  totalAmount: { fontSize: 18, fontWeight: "700" },
  continueButton: {
    backgroundColor: "#000",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  continueText: { color: "#FFF", fontWeight: "600" },
});
