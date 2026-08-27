import React from "react";
import { Image } from "expo-image";
import { StyleSheet, ImageStyle } from "react-native";
import { colors } from "@/constants/colors";

interface Props {
  uri: string;
  size?: number;
  style?: ImageStyle;
}

export function ProfilePhoto({ uri, size = 56, style }: Props) {
  return (
    <Image
      source={{ uri }}
      style={[
        { width: size, height: size, borderRadius: size / 2 },
        styles.img,
        style,
      ]}
      contentFit="cover"
      transition={200}
    />
  );
}

const styles = StyleSheet.create({
  img: { backgroundColor: colors.surfaceAlt },
});
