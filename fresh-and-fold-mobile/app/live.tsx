import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useEffect, useState } from "react";

export default function LiveTracking() {
  const [region, setRegion] = useState({
    latitude: 17.385,
    longitude: 78.4867,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const [riderLocation, setRiderLocation] = useState({
    latitude: 17.385,
    longitude: 78.4867,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setRiderLocation((prev) => ({
        ...prev,
        latitude: prev.latitude + 0.0002,
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Live Tracking</Text>

      <MapView
        style={styles.map}
        region={region}
      >
        <Marker
          coordinate={riderLocation}
          title="Rider"
        />
      </MapView>

      <Text style={styles.footer}>
        Rider is on the way to pickup
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    fontSize: 20,
    fontWeight: "700",
    padding: 20,
  },
  map: {
    flex: 1,
  },
  footer: {
    padding: 20,
    fontWeight: "600",
  },
});
