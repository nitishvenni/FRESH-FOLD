import { Stack, Redirect } from "expo-router";
import { AuthProvider, useAuth } from "../context/AuthContext";

function RootNavigation() {
  const { isLoggedIn, loading } = useAuth();

  if (loading) return null; // wait until AsyncStorage check finishes

  if (!isLoggedIn) {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}
