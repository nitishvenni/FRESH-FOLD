import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");

  const handleLogin = async () => {
  if (mobile.length !== 10) {
    Alert.alert("Invalid Number", "Please enter a valid 10-digit mobile number.");
    return;
  }

  try {
    const response = await fetch("http://10.0.2.2:4000/auth/send-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mobile }),
    });

    const data = await response.json();

    if (response.ok) {
     router.push({
  pathname: "/otp",
  params: { mobile },
});

    } else {
      Alert.alert("Error", data.message);
    }
  } catch (error) {
    Alert.alert("Network Error", "Could not connect to server.");
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fresh & Fold</Text>
      <Text style={styles.subtitle}>Login to continue</Text>

      <TextInput
        placeholder="Enter mobile number"
        keyboardType="phone-pad"
        maxLength={10}
        value={mobile}
        onChangeText={setMobile}
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
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
});
