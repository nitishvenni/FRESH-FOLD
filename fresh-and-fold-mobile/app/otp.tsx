import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "../context/AuthContext";

export default function OTPScreen() {
    
    const router = useRouter();
    
    const { mobile } = useLocalSearchParams();

  const { login } = useAuth();
  const [otp, setOtp] = useState("");

const verifyOtp = async () => {
  try {
    const response = await fetch("http://10.0.2.2:4000/auth/verify-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mobile: String(mobile),
        otp,
      }),
    });

    const data = await response.json();

    if (data.success) {
      // 🔐 Store token
      await AsyncStorage.setItem("token", data.token);
      

const savedToken = await AsyncStorage.getItem("token");
console.log("Saved Token:", savedToken);


      login(); // your context login
      router.replace("/home");
    } else {
      Alert.alert("Error", data.message || "Invalid OTP");
    }
  } catch (error) {
    Alert.alert("Network Error", "Could not connect to server.");
  }
  
};



  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>

      <TextInput
        placeholder="Enter 6-digit OTP"
        keyboardType="number-pad"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={verifyOtp}>
        <Text style={styles.buttonText}>Verify</Text>
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
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#000000",
    padding: 14,
    borderRadius: 6,
    marginBottom: 16,
    fontSize: 16,
    textAlign: "center",
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
