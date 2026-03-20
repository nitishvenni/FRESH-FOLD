import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import Card from "./Card";

type TimeSlotCardProps = {
  slot: string;
  description: string;
  selected: boolean;
  onPress: () => void;
};

export default function TimeSlotCard({
  slot,
  description,
  selected,
  onPress,
}: TimeSlotCardProps) {
  const { theme } = useAppTheme();

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <Card
        style={[
          styles.card,
          selected && {
            borderWidth: 2,
            borderColor: theme.primary,
            shadowColor: theme.primary,
            shadowOpacity: 0.12,
          },
        ]}
      >
        <View style={styles.row}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>{slot}</Text>
            <Text style={[styles.description, { color: theme.textMuted }]}>{description}</Text>
          </View>
          <View
            style={[
              styles.indicator,
              {
                borderColor: selected ? theme.primary : theme.border,
                backgroundColor: selected ? theme.primary : theme.background,
              },
            ]}
          >
            {selected ? <MaterialIcons name="check" size={16} color={theme.surface} /> : null}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    padding: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
  },
  indicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
