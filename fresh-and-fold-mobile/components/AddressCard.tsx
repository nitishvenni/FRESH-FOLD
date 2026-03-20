import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import Card from "./Card";

type Address = {
  _id: string;
  fullName: string;
  street: string;
  city: string;
  pincode: string;
};

type AddressCardProps = {
  address: Address;
  selected: boolean;
  onPress: () => void;
};

export default function AddressCard({
  address,
  selected,
  onPress,
}: AddressCardProps) {
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
            shadowOpacity: 0.1,
          },
        ]}
      >
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>
            <MaterialIcons name="location-on" size={22} color={theme.primary} />
          </View>

          <View style={styles.copy}>
            <Text style={[styles.name, { color: theme.text }]}>{address.fullName}</Text>
            <Text style={[styles.street, { color: theme.textMuted }]}>{address.street}</Text>
            <Text style={[styles.city, { color: theme.textMuted }]}>
              {address.city} - {address.pincode}
            </Text>
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
    padding: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  copy: {
    flex: 1,
  },
  name: {
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 2,
  },
  street: {
    marginTop: 2,
    fontSize: 14,
  },
  city: {
    fontSize: 13,
    marginTop: 2,
  },
  indicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
});
