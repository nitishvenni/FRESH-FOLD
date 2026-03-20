import NetInfo from "@react-native-community/netinfo/lib/commonjs/index.js";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NetInfoState } from "@react-native-community/netinfo";

export default function NetworkBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setOffline(!(state.isConnected && state.isInternetReachable !== false));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!offline) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#B42318",
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});
