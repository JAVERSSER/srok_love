import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { spacing, font, shadow } from "@/constants/spacing";
import type { LocalImage } from "@/services/api";

const SIZE = 132;
const RING = 4;

/** Opens the photo library with a square crop. Resolves to null if cancelled. */
export async function pickAvatarImage(): Promise<LocalImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  const asset = !result.canceled ? result.assets[0] : undefined;
  return asset ? { uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName } : null;
}

interface Props {
  uri?: string | null;
  onPick: () => void;
  onRemove?: () => void;
  /** Shows a spinner over the photo and blocks taps. */
  busy?: boolean;
  error?: string | null;
}

/** The single round profile photo, with a camera button to add or change it. */
export function AvatarPicker({ uri, onPick, onRemove, busy, error }: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={uri ? "Change profile photo" : "Add profile photo"}
        onPress={onPick}
        disabled={busy}
        style={({ pressed }) => [styles.ring, !uri && styles.ringEmpty, pressed && styles.pressed]}
      >
        <View style={styles.avatar}>
          {uri ? (
            <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          ) : (
            <Ionicons name="person" size={56} color={colors.primary} style={styles.placeholder} />
          )}
          {busy && (
            <View style={styles.busy}>
              <ActivityIndicator color={colors.white} />
            </View>
          )}
        </View>
        <View style={styles.camera}>
          <Ionicons name={uri ? "camera" : "add"} size={18} color={colors.white} />
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable onPress={onPick} disabled={busy} hitSlop={8}>
          <Text style={styles.action}>{uri ? "Change photo" : "Add profile photo"}</Text>
        </Pressable>
        {uri && onRemove ? (
          <>
            <Text style={styles.dot}>·</Text>
            <Pressable onPress={onRemove} disabled={busy} hitSlop={8}>
              <Text style={[styles.action, styles.remove]}>Remove</Text>
            </Pressable>
          </>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", marginVertical: spacing.md },
  ring: {
    width: SIZE + RING * 4,
    height: SIZE + RING * 4,
    borderRadius: (SIZE + RING * 4) / 2,
    padding: RING,
    borderWidth: RING / 2 + 1,
    borderColor: colors.primary,
    ...shadow.soft,
    backgroundColor: colors.white,
  },
  ringEmpty: { borderStyle: "dashed" },
  pressed: { opacity: 0.85 },
  avatar: {
    flex: 1,
    borderRadius: SIZE / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  placeholder: { opacity: 0.6 },
  busy: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.overlay,
  },
  camera: {
    position: "absolute",
    right: 4,
    bottom: 4,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.white,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  action: { fontSize: font.body, fontWeight: "700", color: colors.primary },
  remove: { color: colors.textSecondary },
  dot: { color: colors.textTertiary },
  error: { color: colors.danger, fontSize: font.small, marginTop: spacing.sm, textAlign: "center" },
});
