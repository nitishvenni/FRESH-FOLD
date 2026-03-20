import { useColorScheme } from "./use-color-scheme";
import { darkTheme, lightTheme } from "../theme/theme";
import { useThemePreference } from "../context/ThemeContext";

export function useAppTheme() {
  const colorScheme = useColorScheme();
  const { preference, setPreference, loading } = useThemePreference();
  const isDark =
    preference === "system" ? colorScheme === "dark" : preference === "dark";

  return {
    isDark,
    preference,
    setPreference,
    themeLoading: loading,
    theme: isDark ? darkTheme : lightTheme,
  };
}
