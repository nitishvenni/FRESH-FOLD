import { StyleSheet, View } from "react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";

type OrderSkeletonProps = {
  count?: number;
  compact?: boolean;
};

export default function OrderSkeleton({
  count = 3,
  compact = false,
}: OrderSkeletonProps) {
  return (
    <View style={compact ? undefined : styles.container}>
      <SkeletonPlaceholder
        borderRadius={12}
        backgroundColor="#ECECEC"
        highlightColor="#F7F7F7"
      >
        {Array.from({ length: count }).map((_, index) => (
          <SkeletonPlaceholder.Item
            key={index}
            width="100%"
            height={compact ? 112 : 104}
            borderRadius={16}
            marginBottom={compact && index === count - 1 ? 0 : 16}
          />
        ))}
      </SkeletonPlaceholder>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 80,
  },
});
