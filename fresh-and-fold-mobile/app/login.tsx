import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useState } from "react";
import { API_BASE_URL } from "../constants/api";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const testBackend = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();

      setMessage(data.app); // "Fresh & Fold Backend"
    } catch (error) {
      setMessage("Failed to connect to backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fresh & Fold</Text>
      <Text style={styles.subtitle}>Login to continue</Text>

      <TextInput
        placeholder="Enter mobile number"
        keyboardType="phone-pad"
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={testBackend}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Test Backend</Text>
        )}
      </TouchableOpacity>

      {message ? <Text style={styles.result}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#555555",
    marginBottom: 32,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#000000",
    padding: 14,
    borderRadius: 6,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#000000",
    padding: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  result: {
    marginTop: 20,
    textAlign: "center",
    color: "#000000",
    fontSize: 14,
  },
});
