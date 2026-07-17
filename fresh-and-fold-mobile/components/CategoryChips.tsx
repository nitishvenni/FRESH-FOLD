import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { triggerSelectionHaptic } from "../utils/haptics";

export type Category = "all" | "clothing" | "home";

type CategoryChipsProps = {
  selected: Category;
  onSelect: (category: Category) => void;
};

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all", label: "All" },
  { id: "clothing", label: "Clothing" },
  { id: "home", label: "Home & Linen" },
];

export default function CategoryChips({ selected, onSelect }: CategoryChipsProps) {
  const { theme, isDark } = useAppTheme();

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {CATEGORIES.map((cat) => {
          const isActive = selected === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.8}
              onPress={() => {
                if (!isActive) {
                  void triggerSelectionHaptic();
                  onSelect(cat.id);
                }
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive
                    ? theme.primary
                    : isDark
                    ? "rgba(30,41,59,0.4)"
                    : "rgba(255,255,255,0.7)",
                  borderColor: isActive
                    ? theme.primary
                    : isDark
                    ? "rgba(148,163,184,0.15)"
                    : "rgba(203,213,225,0.4)",
                },
              ]}
            >
              <Text
                style={[
                  styles.label,
                  {
                    color: isActive ? "#FFFFFF" : theme.text,
                    fontWeight: isActive ? "600" : "500",
                  },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13.5,
  },
});
