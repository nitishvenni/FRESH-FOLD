import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import Card from "./Card";

export default function PaymentMethodCard() {
  const { theme } = useAppTheme();

  return (
    <Card style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>
        <MaterialIcons name="account-balance-wallet" size={24} color={theme.primary} />
      </View>

      <View style={styles.copy}>
        <Text style={[styles.title, { color: theme.text }]}>Razorpay</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Fast & Secure Payment</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
  },
});
