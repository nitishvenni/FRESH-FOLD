import { StyleSheet, View } from "react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";

export default function TrackOrderSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonPlaceholder
        borderRadius={12}
        backgroundColor="#ECECEC"
        highlightColor="#F7F7F7"
      >
        <SkeletonPlaceholder.Item width={160} height={26} borderRadius={8} />
        <SkeletonPlaceholder.Item
          width={120}
          height={16}
          borderRadius={6}
          marginTop={14}
          marginBottom={32}
        />
        {Array.from({ length: 7 }).map((_, index) => (
          <SkeletonPlaceholder.Item
            key={index}
            flexDirection="row"
            alignItems="center"
            marginBottom={22}
          >
            <SkeletonPlaceholder.Item
              width={16}
              height={16}
              borderRadius={8}
              marginRight={12}
            />
            <SkeletonPlaceholder.Item width={180} height={16} borderRadius={6} />
          </SkeletonPlaceholder.Item>
        ))}
        <SkeletonPlaceholder.Item
          width="100%"
          height={48}
          borderRadius={10}
          marginTop={32}
        />
      </SkeletonPlaceholder>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 24,
    paddingTop: 80,
  },
});
