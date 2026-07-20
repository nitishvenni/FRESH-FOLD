import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

type AICareLogoProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

const lightLogo = require("../assets/images/brand/ai-care-bucket-fold.png");
// This is displayed below 100 dp. Keep the dark variant at the matching decoded size.
const darkLogo = require("../assets/images/brand/ai-care-bucket-fold-dark-compact.png");

export default function AICareLogo({ size = 58, style, imageStyle }: AICareLogoProps) {
  const { isDark } = useAppTheme();
  const visualAlignment = isDark
    ? styles.darkImage
    : { transform: [{ translateX: -size * 0.035 }, { scale: 1.06 }] };

  return (
    <View
      accessible
      accessibilityLabel="AI Care"
      style={[styles.frame, { width: size, height: size, borderRadius: size / 2 }, style]}
    >
      <Image
        source={isDark ? darkLogo : lightLogo}
        resizeMode="contain"
        style={[styles.image, visualAlignment, imageStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  darkImage: {
    transform: [{ scale: 1.36 }],
  },
});
