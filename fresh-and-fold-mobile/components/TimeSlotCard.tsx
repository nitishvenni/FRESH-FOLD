import { MaterialIcons, Feather } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

type TimeSlotCardProps = {
  slot: string;
  description: string; // e.g. "Morning slot"
  selected: boolean;
  onPress: () => void;
};

export default function TimeSlotCard({
  slot,
  description,
  selected,
  onPress,
}: TimeSlotCardProps) {
  const { theme, isDark } = useAppTheme();

  // Determine icon based on description or slot text
  const getIcon = () => {
    const text = description.toLowerCase() + slot.toLowerCase();
    if (text.includes("morning") || text.includes("am")) {
      return <Feather name="sunrise" size={20} color={selected ? theme.primary : theme.textMuted} />;
    }
    if (text.includes("evening") || text.includes("night") || text.includes("6 pm") || text.includes("7 pm")) {
      return <Feather name="moon" size={20} color={selected ? theme.primary : theme.textMuted} />;
    }
    return <Feather name="sun" size={20} color={selected ? theme.primary : theme.textMuted} />;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: selected
            ? isDark
              ? "rgba(30,58,138,0.25)"
              : "rgba(219,234,254,0.4)"
            : isDark
            ? "rgba(17,24,39,0.4)"
            : "rgba(255,255,255,0.7)",
          borderColor: selected
            ? isDark
              ? "rgba(96,165,250,0.4)"
              : "rgba(59,130,246,0.35)"
            : isDark
            ? "rgba(148,163,184,0.15)"
            : "rgba(255,255,255,0.9)",
          borderWidth: 1,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: selected ? theme.primarySoft : "transparent" },
            ]}
          >
            {getIcon()}
          </View>
          <View style={styles.copy}>
            <Text style={[styles.title, { color: theme.text }]}>{slot}</Text>
            <Text style={[styles.description, { color: theme.textMuted }]}>{description}</Text>
          </View>
        </View>

        <View style={styles.right}>
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
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
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
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
  },
  right: {
    paddingLeft: 12,
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
