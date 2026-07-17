import { MaterialIcons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { triggerSelectionHaptic } from "../utils/haptics";

type HorizontalServiceCardProps = {
  id: string;
  title: string;
  description: string;
  basePrice: number;
  icon?: React.ComponentProps<typeof MaterialIcons>["name"];
  imageSource?: any;
  selected: boolean;
  onPress: () => void;
};

export default function HorizontalServiceCard({
  id,
  title,
  description,
  basePrice,
  icon,
  imageSource,
  selected,
  onPress,
}: HorizontalServiceCardProps) {
  const { theme, isDark } = useAppTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        if (!selected) {
          void triggerSelectionHaptic();
          onPress();
        }
      }}
      style={[
        styles.card,
        {
          backgroundColor: selected
            ? isDark
              ? "rgba(30,58,138,0.25)" // Subtle blue-tinted translucent background
              : "rgba(219,234,254,0.4)" // Soft blue translucent
            : isDark
            ? "rgba(17,24,39,0.4)"
            : "rgba(255,255,255,0.7)",
          borderColor: selected
            ? isDark
              ? "rgba(96,165,250,0.4)" // Thin blue-translucent border
              : "rgba(59,130,246,0.35)"
            : isDark
            ? "rgba(148,163,184,0.15)"
            : "rgba(255,255,255,0.9)",
          borderWidth: 1,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.left}>
          {icon && (
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: selected ? theme.primary : theme.primarySoft,
                },
              ]}
            >
              <MaterialIcons
                name={icon}
                size={20}
                color={selected ? "#FFFFFF" : theme.primary}
              />
            </View>
          )}
          <View style={styles.copy}>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.desc, { color: theme.textMuted }]} numberOfLines={2}>
              {description}
            </Text>
            <Text style={[styles.price, { color: theme.text }]}>
              ₹{basePrice} <Text style={[styles.priceUnit, { color: theme.textMuted }]}>/ item</Text>
            </Text>
          </View>
        </View>

        <View style={styles.right}>
          {imageSource && (
            <View style={[styles.imageContainer, selected && styles.imageSelected]}>
              <Image source={imageSource} style={styles.image} resizeMode="contain" />
            </View>
          )}
        </View>
      </View>

      {/* Absolutely positioned checkmark for a clean layout without overlapping */}
      <View style={styles.checkmarkContainer}>
        {selected ? (
          <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
            <MaterialIcons name="check" size={12} color="#FFFFFF" />
          </View>
        ) : (
          <View
            style={[
              styles.emptyCircle,
              { borderColor: isDark ? "rgba(148,163,184,0.3)" : "rgba(203,213,225,0.8)" },
            ]}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginBottom: 12,
    overflow: "hidden",
    position: "relative",
  },
  content: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 100,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
    zIndex: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  copy: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  desc: {
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  price: {
    fontSize: 14,
    fontWeight: "600",
  },
  priceUnit: {
    fontSize: 12,
    fontWeight: "400",
  },
  right: {
    width: 80,
    height: 80,
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 1,
  },
  imageContainer: {
    width: 90,
    height: 90,
    position: "absolute",
    right: -10,
    bottom: -2,
    opacity: 0.9,
  },
  imageSelected: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  image: {
    width: "100%",
    height: "100%",
  },
  checkmarkContainer: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 3,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
});
