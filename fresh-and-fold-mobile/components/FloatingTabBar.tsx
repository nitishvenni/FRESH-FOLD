import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type TabItem = {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  active?: boolean;
  onPress: () => void;
};

type FloatingTabBarProps = {
  leftTabs: [TabItem, TabItem];
  rightTabs: [TabItem, TabItem];
  onCenterPress: () => void;
};

function TabButton({ icon, label, active, onPress }: TabItem) {
  return (
    <TouchableOpacity style={styles.tabItem} activeOpacity={0.82} onPress={onPress}>
      <MaterialIcons name={icon} size={20} color={active ? "#0F172A" : "#6B7280"} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function FloatingTabBar({
  leftTabs,
  rightTabs,
  onCenterPress,
}: FloatingTabBarProps) {
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.glassShell}>
        <View style={styles.overlay} />
        <View style={styles.row}>
          <View style={styles.sideGroup}>
            {leftTabs.map((tab) => (
              <TabButton key={tab.label} {...tab} />
            ))}
          </View>
          <View style={styles.centerSpacer} />
          <View style={styles.sideGroup}>
            {rightTabs.map((tab) => (
              <TabButton key={tab.label} {...tab} />
            ))}
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.centerButton} activeOpacity={0.88} onPress={onCenterPress}>
        <MaterialIcons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
    alignItems: "center",
  },
  glassShell: {
    width: "100%",
    height: 74,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.86)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.34)",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  sideGroup: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  centerSpacer: {
    width: 72,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 58,
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabLabelActive: {
    color: "#0F172A",
  },
  centerButton: {
    position: "absolute",
    top: -22,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
});
