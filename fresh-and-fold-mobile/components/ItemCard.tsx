import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { triggerSelectionHaptic } from "../utils/haptics";

const ICONS = {
  shirt: "tshirt-crew",
  tshirt: "tshirt-crew-outline",
  jeans: "hanger",
  trousers: "hanger",
  dress: "tshirt-crew",
  jacket: "coat-rack",
  sweater: "tshirt-crew",
  bedsheet: "bed",
  pillowcover: "bed-outline",
  towel: "shower",
  curtain: "curtains",
  blanket: "bed",
} as const;

type ItemCardProps = {
  item: {
    key: keyof typeof ICONS;
    name: string;
    price: number;
  };
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  index?: number;
};

export default function ItemCard({
  item,
  quantity,
  onAdd,
  onRemove,
  index = 0,
}: ItemCardProps) {
  const { theme, isDark } = useAppTheme();

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(320)}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? "rgba(17,24,39,0.4)" : "rgba(255,255,255,0.7)",
            borderColor: isDark ? "rgba(148,163,184,0.15)" : "rgba(255,255,255,0.9)",
          },
        ]}
      >
        <View style={styles.row}>
          <View style={styles.leftSide}>
            <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>
              <MaterialCommunityIcons name={ICONS[item.key]} size={26} color={theme.primary} />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.price, { color: theme.textMuted }]}>₹{item.price} per item</Text>
            </View>
          </View>

          <View style={styles.counter}>
            <TouchableOpacity
              onPress={() => {
                if (quantity > 0) {
                  void triggerSelectionHaptic();
                  onRemove();
                }
              }}
              style={[
                styles.btn,
                { backgroundColor: theme.surfaceAlt },
                quantity === 0 && {
                  backgroundColor: "transparent",
                  borderWidth: 1,
                  borderColor: theme.border,
                  opacity: 0.5,
                },
              ]}
              activeOpacity={0.85}
              disabled={quantity === 0}
            >
              <Text style={[styles.btnText, { color: quantity === 0 ? theme.textMuted : theme.text }]}>-</Text>
            </TouchableOpacity>

            <Animated.Text
              key={`${item.key}-${quantity}`}
              entering={FadeIn.duration(180)}
              style={[styles.qty, { color: theme.text }]}
            >
              {quantity}
            </Animated.Text>

            <TouchableOpacity
              onPress={() => {
                void triggerSelectionHaptic();
                onAdd();
              }}
              style={[styles.btnPrimary, { backgroundColor: theme.primary }]}
              activeOpacity={0.9}
            >
              <Text style={styles.btnPrimaryText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftSide: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  copy: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  price: {
    fontSize: 13,
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
  },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 18,
    fontWeight: "700",
  },
  qty: {
    minWidth: 30,
    textAlign: "center",
    marginHorizontal: 10,
    fontSize: 15,
    fontWeight: "700",
  },
  btnPrimary: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
