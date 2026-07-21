import { Stack, usePathname, useRootNavigationState, useRouter } from "expo-router";
import Constants from "expo-constants";
import * as SplashScreen from "expo-splash-screen";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import { useEffect, useRef } from "react";
import { BackHandler, Platform, Text, TextInput, View } from "react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import Loader from "../components/Loader";
import NetworkBanner from "../components/NetworkBanner";
import AppTabBar from "../components/AppTabBar";
import ToastHost from "../components/ToastHost";
import { useAppTheme } from "../hooks/useAppTheme";
import { typography } from "../theme/theme";
import { bootstrapNotifications } from "../utils/notifications";
import { getAuthRedirectTarget } from "../utils/authRedirect";
import { shouldReturnMainTabBackToHome } from "../utils/mainTabBack";

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore splash lock races during reloads.
});

let typographyApplied = false;

const applyGlobalTypography = () => {
  if (typographyApplied) {
    return;
  }

  const TextComponent = Text as typeof Text & { defaultProps?: { style?: unknown } };
  const TextInputComponent = TextInput as typeof TextInput & {
    defaultProps?: { style?: unknown; placeholderTextColor?: string };
  };

  TextComponent.defaultProps = {
    ...TextComponent.defaultProps,
    style: [{ fontFamily: typography.body }, TextComponent.defaultProps?.style],
  };

  TextInputComponent.defaultProps = {
    ...TextInputComponent.defaultProps,
    style: [{ fontFamily: typography.body }, TextInputComponent.defaultProps?.style],
    placeholderTextColor: "#9CA3AF",
  };

  typographyApplied = true;
};

if (Constants.appOwnership !== "expo") {
  void import("expo-notifications")
    .then((Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    })
    .catch(() => {
      // Ignore notification handler setup issues in unsupported environments.
    });
}

function RootNavigation() {
  const { loading, isLoggedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const lastRedirectRef = useRef<string | null>(null);
  const { theme, themeLoading } = useAppTheme();

  useEffect(() => {
    void bootstrapNotifications();
  }, []);

  useEffect(() => {
    if (loading || themeLoading || !rootNavigationState?.key) return;
    const target = getAuthRedirectTarget(pathname, isLoggedIn);
    if (!target) {
      lastRedirectRef.current = null;
      return;
    }
    const redirectKey = `${pathname}->${target}`;
    if (lastRedirectRef.current === redirectKey) return;
    lastRedirectRef.current = redirectKey;
    router.replace(target);
  }, [isLoggedIn, loading, pathname, rootNavigationState?.key, router, themeLoading]);

  useEffect(() => {
    if (Platform.OS !== "android" || !shouldReturnMainTabBackToHome(pathname)) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      router.replace("/home");
      return true;
    });
    return () => subscription.remove();
  }, [pathname, router]);

  if (loading || themeLoading) {
    return <Loader />;
  }

  const showTabs =
    isLoggedIn &&
    ["/home", "/order-history", "/ai-care", "/support", "/profile"].includes(pathname);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <NetworkBanner />
      <ToastHost />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: Platform.OS === "ios" ? "default" : "slide_from_right",
          animationDuration: 220,
          contentStyle: { backgroundColor: theme.background },
          gestureEnabled: true,
        }}
      />
      {showTabs ? <AppTabBar /> : null}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    applyGlobalTypography();
    void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <Loader />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigation />
      </AuthProvider>
    </ThemeProvider>
  );
}
