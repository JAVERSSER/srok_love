import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { spacing, font, shadow } from "@/constants/spacing";
import type { LocalImage } from "@/services/api";

const SIZE = 132;
const RING = 4;

// Uploaded photos are shrunk to this many pixels square and saved as JPEG at
// this quality: sharp enough for a full-width card, and usually 50–150 KB
// (well under Vercel's 4.5 MB request limit on web).
const UPLOAD_PX = 720;
const UPLOAD_QUALITY = 0.7;

/** Opens the photo library with a crop (square by default). Resolves to null if cancelled. */
export async function pickAvatarImage(aspect: [number, number] = [1, 1]): Promise<LocalImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect,
    quality: 1, // compressed once, below
  });
  const asset = !result.canceled ? result.assets[0] : undefined;
  return asset ? shrink(asset) : null;
}

/**
 * Opens the photo library to pick up to `limit` photos at once. The system
 * picker can't crop when selecting several, so they're only resized.
 * Resolves to [] if cancelled.
 */
export async function pickPhotos(limit: number): Promise<LocalImage[]> {
  if (limit <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    orderedSelection: true,
    quality: 1, // compressed once, below
  });
  if (result.canceled) return [];
  return Promise.all(result.assets.slice(0, limit).map(shrink));
}

async function shrink(asset: ImagePicker.ImagePickerAsset): Promise<LocalImage> {
  // Scale by the longer side so the photo fits in UPLOAD_PX either way.
  const resize =
    asset.width >= asset.height
      ? { width: Math.min(asset.width || UPLOAD_PX, UPLOAD_PX) }
      : { height: Math.min(asset.height || UPLOAD_PX, UPLOAD_PX) };
  const rendered = await ImageManipulator.manipulate(asset.uri).resize(resize).renderAsync();
  const small = await rendered.saveAsync({ compress: UPLOAD_QUALITY, format: SaveFormat.JPEG });
  return { uri: small.uri, mimeType: "image/jpeg", fileName: "photo.jpg" };
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
