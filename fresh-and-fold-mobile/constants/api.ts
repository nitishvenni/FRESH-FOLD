import Constants from "expo-constants";

const configuredApiBaseUrl = String(
  Constants.expoConfig?.extra?.apiBaseUrl ||
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    ""
).trim();

export const API_BASE_URL =
  configuredApiBaseUrl ||
  "https://fresh-and-fold-backend.onrender.com";
