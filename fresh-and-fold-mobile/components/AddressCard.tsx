import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

type Address = {
  _id: string;
  fullName: string;
  street: string;
  city: string;
  pincode: string;
  addressType?: string;
};

type AddressCardProps = {
  address: Address;
  selected: boolean;
  onPress: () => void;
  onEdit?: () => void;
};

export default function AddressCard({
  address,
  selected,
  onPress,
  onEdit,
}: AddressCardProps) {
  const { theme, isDark } = useAppTheme();
  const addressType = address.addressType || "Address";

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <View
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
            shadowColor: selected ? theme.primary : "#000",
            shadowOpacity: selected ? (isDark ? 0.3 : 0.1) : 0.02,
          },
        ]}
      >
        <View style={styles.row}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: selected ? theme.primarySoft : "transparent" },
            ]}
          >
            <MaterialIcons
              name="location-on"
              size={22}
              color={selected ? theme.primary : theme.textMuted}
            />
          </View>

          <View style={styles.copy}>
            <View style={styles.titleRow}>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                {addressType}
              </Text>
              <Text style={[styles.receiver, { color: theme.textMuted }]} numberOfLines={1}>
                {address.fullName}
              </Text>
            </View>
            <Text style={[styles.street, { color: theme.textMuted }]}>{address.street}</Text>
            <Text style={[styles.city, { color: theme.textMuted }]}>
              {address.city} - {address.pincode}
            </Text>
          </View>

          <View style={styles.actions}>
            {onEdit ? (
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.editButton,
                  { backgroundColor: isDark ? "rgba(148,163,184,0.15)" : "rgba(241,245,249,0.8)" },
                ]}
                onPress={(event) => {
                  event.stopPropagation();
                  onEdit();
                }}
              >
                <MaterialIcons name="edit" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            ) : null}
            <View style={styles.rightCheck}>
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
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 0,
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 2,
  },
  receiver: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  street: {
    marginTop: 2,
    fontSize: 14,
  },
  city: {
    fontSize: 13,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginLeft: 12,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  rightCheck: {
    justifyContent: "center",
    alignItems: "center",
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
