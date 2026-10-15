import React from "react";
import { Image } from "expo-image";
import { View, StyleSheet, ImageStyle, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";

interface Props {
  uri?: string | null;
  size?: number;
  style?: StyleProp<ImageStyle>;
}

/** A round user photo, or the default user picture when there's no photo. */
export function ProfilePhoto({ uri, size = 56, style }: Props) {
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (!uri) return <DefaultAvatar size={size} style={style as StyleProp<ViewStyle>} />;
  return (
    <Image
      source={{ uri }}
      style={[round, styles.img, style]}
      contentFit="cover"
      // Keep the full-quality photo in memory so lists don't re-decode a blurry copy.
      cachePolicy="memory-disk"
      transition={200}
    />
  );
}

/** The default user picture: a person silhouette on a soft circle. */
export function DefaultAvatar({ size = 56, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessibilityLabel="Default profile picture"
      style={[{ width: size, height: size, borderRadius: size / 2 }, styles.fallback, style]}
    >
      <Ionicons name="person" size={size * 0.7} color={colors.textTertiary} style={{ marginTop: size * 0.2 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  img: { backgroundColor: colors.surfaceAlt },
  fallback: {
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
