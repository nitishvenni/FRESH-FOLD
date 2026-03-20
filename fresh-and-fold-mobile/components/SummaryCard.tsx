import { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import Card from "./Card";

type SummaryCardProps = {
  title: string;
  children: ReactNode;
};

export default function SummaryCard({ title, children }: SummaryCardProps) {
  const { theme } = useAppTheme();

  return (
    <Card style={styles.card}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
});
