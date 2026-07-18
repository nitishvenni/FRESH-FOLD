import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AICareLogo from "../components/AICareLogo";
import Card from "../components/Card";
import { useAppTheme } from "../hooks/useAppTheme";

export default function AICareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 36 }]}>
      <AICareLogo size={96} style={[styles.logo, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]} />
      <Text style={[styles.title, { color: theme.text }]}>AI Care</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>Your intelligent laundry care space.</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Open Smart Scan"
        activeOpacity={0.86}
        style={styles.cardPressable}
        onPress={() => router.push("/smart-scan" as never)}
      >
        <Card style={[styles.card, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>
            <MaterialIcons name="document-scanner" size={24} color={theme.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Smart Scan</Text>
          <Text style={[styles.cardCopy, { color: theme.textMuted }]}>Use a photo to identify garments for your review.</Text>
        </Card>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Open Stain Detection"
        activeOpacity={0.86}
        style={styles.secondaryCardPressable}
        onPress={() => router.push("/stain-scan" as never)}
      >
        <Card style={[styles.card, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>
            <MaterialIcons name="search" size={24} color={theme.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Stain Detection</Text>
          <Text style={[styles.cardCopy, { color: theme.textMuted }]}>Use a photo for cautious stain and cleaning guidance.</Text>
        </Card>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Open Fabric Identification"
        activeOpacity={0.86}
        style={styles.secondaryCardPressable}
        onPress={() => router.push("/fabric-scan" as never)}
      >
        <Card style={[styles.card, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>
            <MaterialIcons name="texture" size={24} color={theme.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Fabric Identification</Text>
          <Text style={[styles.cardCopy, { color: theme.textMuted }]}>Use a photo for cautious fabric and care guidance.</Text>
        </Card>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.primary }]} onPress={() => router.replace("/home")}>
        <Text style={styles.backText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", paddingHorizontal: 30 },
  logo: { borderWidth: 1, marginTop: 22 },
  title: { marginTop: 24, fontSize: 30, fontWeight: "700" },
  subtitle: { marginTop: 8, fontSize: 15 },
  card: { width: "100%", alignItems: "center", paddingVertical: 28 },
  cardPressable: { width: "100%", marginTop: 38 },
  secondaryCardPressable: { width: "100%", marginTop: 14 },
  iconWrap: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  cardTitle: { marginTop: 14, fontSize: 18, fontWeight: "700" },
  cardCopy: { marginTop: 8, fontSize: 14, lineHeight: 20, textAlign: "center", maxWidth: 260 },
  backButton: { width: "100%", height: 52, marginTop: 22, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  backText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
