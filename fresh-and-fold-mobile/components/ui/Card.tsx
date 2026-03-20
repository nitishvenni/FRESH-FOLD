import { ReactNode } from "react";
import { StyleProp, ViewStyle } from "react-native";
import BaseCard from "../Card";

type UiCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function Card({ children, style }: UiCardProps) {
  return <BaseCard style={style}>{children}</BaseCard>;
}
