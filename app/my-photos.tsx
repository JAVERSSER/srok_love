import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore, MAX_PHOTOS } from "@/store/appStore";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PhotoPreview } from "@/components/PhotoPreview";
import { pickPhotos } from "@/components/AvatarPicker";
import { colors } from "@/constants/colors";
import { spacing, font, radius } from "@/constants/spacing";


export default function MyPhotos() {
  const photos = useAppStore((s) => s.myPhotos);
  const addPhotos = useAppStore((s) => s.addPhotos);
  const removePhoto = useAppStore((s) => s.removePhoto);
  // Which tile is working: a photo id, or "new" while uploads run.
  const [busy, setBusy] = useState<number | "new" | null>(null);
  const [uploadCount, setUploadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const run = async (key: NonNullable<typeof busy>, task: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const add = async () => {
    if (busy) return;
    const images = await pickPhotos(MAX_PHOTOS - photos.length);
    if (!images.length) return;
    setUploadCount(images.length);
    await run("new", () => addPhotos(images));
    setUploadCount(0);
  };

  const remove = (id: number) => {
    const doRemove = () => run(id, () => removePhoto(id));
    if (Platform.OS === "web") return doRemove();
    Alert.alert("Remove photo?", "It will no longer show on your profile.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: doRemove },
    ]);
  };

  const slots = Array.from({ length: MAX_PHOTOS }, (_, i) => photos[i]);
  const firstEmpty = photos.length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="My Photos" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.hint}>
          Get up to 2x more likes with 6 pics. You can pick several at once. These show on your profile card; your profile picture is set separately. Tap a photo to preview it.
        </Text>

        <View style={styles.grid}>
          {slots.map((photo, i) => {
            const working =
              (photo && busy === photo.id) || (busy === "new" && i >= firstEmpty && i < firstEmpty + uploadCount);
            return (
              <View key={photo ? `p${photo.id}-${i}` : `e${i}`} style={styles.cell}>
                {photo ? (
                  <Pressable style={styles.tile} onPress={() => setPreviewIndex(i)}>
                    <Image source={{ uri: photo.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.tile, styles.emptyTile]}
                    onPress={add}
                    disabled={!!busy}
                    accessibilityLabel="Add photo"
                  />
                )}

                {working && (
                  <View style={[styles.tile, styles.busy]}>
                    <ActivityIndicator color={colors.white} />
                  </View>
                )}

                {/* Corner button: ✕ removes, + adds. */}
                {photo ? (
                  <Pressable
                    style={[styles.corner, styles.cornerDark]}
                    onPress={() => remove(photo.id)}
                    disabled={!!busy}
                    hitSlop={6}
                    accessibilityLabel="Remove photo"
                  >
                    <Ionicons name="close" size={18} color={colors.white} />
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.corner, styles.cornerLight]}
                    onPress={add}
                    disabled={!!busy}
                    hitSlop={6}
                    accessibilityLabel="Add photo"
                  >
                    <Ionicons name="add" size={20} color={colors.primary} />
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <PhotoPreview
        photos={photos.map((p) => p.url)}
        index={previewIndex}
        onClose={() => setPreviewIndex(null)}
      />
    </SafeAreaView>
  );
}

const GAP = 12;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  hint: { fontSize: font.small, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 19 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -GAP / 2 },
  cell: { width: "33.333%", padding: GAP / 2, paddingTop: GAP },
  tile: {
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
  },
  emptyTile: { borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.border },
  busy: {
    position: "absolute",
    top: GAP,
    left: GAP / 2,
    right: GAP / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.overlay,
  },
  corner: {
    position: "absolute",
    top: 2,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  cornerDark: { backgroundColor: "rgba(20,20,24,0.85)" },
  cornerLight: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  error: { color: colors.danger, fontSize: font.small, marginTop: spacing.lg, textAlign: "center" },
});
