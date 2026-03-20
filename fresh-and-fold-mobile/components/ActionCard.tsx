import { MaterialIcons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Card from "./Card";

type ActionCardProps = {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  title: string;
  subtitle: string;
  accentColor?: string;
  rightSlot?: ReactNode;
  onPress: () => void;
};

export default function ActionCard({
  icon,
  title,
  subtitle,
  accentColor = "#2563EB",
  rightSlot,
  onPress,
}: ActionCardProps) {
  return (
    <TouchableOpacity style={styles.touchable} activeOpacity={0.88} onPress={onPress}>
      <Card style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: `${accentColor}15` }]}>
          <MaterialIcons name={icon} size={22} color={accentColor} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
  },
  card: {
    minHeight: 142,
    justifyContent: "space-between",
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6B7280",
  },
  rightSlot: {
    marginTop: 14,
  },
});
