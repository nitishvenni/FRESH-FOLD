import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import Card from "./Card";

type ServiceCardProps = {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  title: string;
  description: string;
  meta?: string;
  selected?: boolean;
  variant?: "compact" | "selection";
  onPress: () => void;
};

export default function ServiceCard({
  icon,
  title,
  description,
  meta,
  selected = false,
  variant = "compact",
  onPress,
}: ServiceCardProps) {
  const { theme } = useAppTheme();
  const isSelection = variant === "selection";

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
      <Card
        style={[
          styles.card,
          isSelection && styles.selectionCard,
          selected && { borderWidth: 2, borderColor: theme.primary, shadowColor: theme.primary, shadowOpacity: 0.1 },
        ]}
      >
        <View style={[styles.topRow, isSelection && styles.selectionTopRow]}>
          <View
            style={[
              styles.iconWrap,
              isSelection && styles.selectionIconWrap,
              { backgroundColor: theme.primarySoft },
            ]}
          >
            <MaterialIcons name={icon} size={20} color={theme.primary} />
          </View>
          {isSelection ? (
            <View
              style={[
                styles.selectionIndicator,
                {
                  borderColor: selected ? theme.primary : theme.border,
                  backgroundColor: selected ? theme.primary : theme.background,
                },
              ]}
            >
              {selected ? <MaterialIcons name="check" size={16} color={theme.surface} /> : null}
            </View>
          ) : (
            <MaterialIcons name="arrow-forward" size={18} color={theme.textMuted} />
          )}
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.description, { color: theme.textMuted }]}>{description}</Text>
        {meta ? (
          <View style={styles.metaRow}>
            <MaterialIcons name="schedule" size={15} color={theme.primary} />
            <Text style={[styles.metaText, { color: theme.primary }]}>{meta}</Text>
          </View>
        ) : null}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
  },
  selectionCard: {
    borderRadius: 22,
    padding: 20,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  selectionTopRow: {
    marginBottom: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
  },
  selectionIndicator: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  metaText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
  },
});
