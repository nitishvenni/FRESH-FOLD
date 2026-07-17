import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

type AICareLogoProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

const lightLogo = require("../assets/images/brand/ai-care-bucket-fold.png");
const darkLogo = require("../assets/images/brand/ai-care-bucket-fold-dark.png");

export default function AICareLogo({ size = 58, style, imageStyle }: AICareLogoProps) {
  const { isDark } = useAppTheme();

  return (
    <View
      accessible
      accessibilityLabel="AI Care"
      style={[styles.frame, { width: size, height: size, borderRadius: size / 2 }, style]}
    >
      <Image
        source={isDark ? darkLogo : lightLogo}
        resizeMode="contain"
        style={[styles.image, imageStyle]}
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
});
