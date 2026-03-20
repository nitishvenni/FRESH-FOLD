import Constants from "expo-constants";

const configuredApiBaseUrl = String(
  Constants.expoConfig?.extra?.apiBaseUrl ||
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    ""
).trim();
const debuggerHost = Constants.expoConfig?.hostUri?.split(":")[0];

export const API_BASE_URL =
  configuredApiBaseUrl ||
  (debuggerHost ? `http://${debuggerHost}:4000` : "http://localhost:4000");
