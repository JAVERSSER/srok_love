import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { UserProfile } from "@/models";
import { InterestTag } from "@/components/InterestTag";
import { colors } from "@/constants/colors";
import { spacing, font, radius, shadow } from "@/constants/spacing";

interface Props {
  user: UserProfile;
  photos: string[];
  nameLine: string;
  locLine: string;
  /** Opens the full profile (the ⓘ button). */
  onInfo: () => void;
}

// Bottom fade made of stacked translucent bands (no gradient library needed).
const FADE = [0.04, 0.08, 0.14, 0.22, 0.32, 0.42, 0.5];

/**
 * Your profile as a Tinder-style card: tap the right side of the photo for the
 * next one, the left side to go back. Each photo shows a different part of the
 * profile underneath the name, like the real card does.
 */
export function PreviewCard({ user, photos, nameLine, locLine, onInfo }: Props) {
  const [index, setIndex] = useState(0);
  const current = Math.min(index, Math.max(0, photos.length - 1));
  const step = (by: number) => setIndex(Math.max(0, Math.min(photos.length - 1, current + by)));

  // What shows under the name for each photo.
  const details = [
    user.occupation && { icon: "briefcase-outline" as const, text: user.occupation },
    user.education && { icon: "school-outline" as const, text: user.education },
    user.height && { icon: "resize-outline" as const, text: user.height },
    user.relationshipGoal && { icon: "heart-outline" as const, text: user.relationshipGoal },
  ].filter(Boolean) as { icon: keyof typeof Ionicons.glyphMap; text: string }[];

  const pages: React.ReactNode[] = [
    locLine ? (
      <View key="loc" style={styles.row}>
        <Ionicons name="location-sharp" size={16} color={colors.white} />
        <Text style={styles.line}>{locLine}</Text>
      </View>
    ) : null,
    user.bio ? (
      <Text key="bio" style={styles.line} numberOfLines={3}>
        {user.bio}
      </Text>
    ) : null,
    user.interests.length ? (
      <View key="interests" style={styles.tags}>
        {user.interests.slice(0, 5).map((i) => (
          <InterestTag key={i} label={i} />
        ))}
      </View>
    ) : null,
    details.length ? (
      <View key="details" style={{ gap: 4 }}>
        {details.map((d) => (
          <View key={d.text} style={styles.row}>
            <Ionicons name={d.icon} size={16} color={colors.white} />
            <Text style={styles.line}>{d.text}</Text>
          </View>
        ))}
      </View>
    ) : null,
  ].filter(Boolean);
  const page = pages.length ? pages[current % pages.length] : null;

  return (
    <View style={styles.card}>
      {photos.length ? (
        <Image source={{ uri: photos[current] }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.empty]}>
          <Ionicons name="images-outline" size={56} color={colors.textTertiary} />
          <Text style={styles.emptyText}>Add photos in My Photos</Text>
        </View>
      )}

      <View style={styles.fade} pointerEvents="none">
        {FADE.map((o, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: `rgba(0,0,0,${o})` }} />
        ))}
      </View>

      {/* Left half goes back, right half goes forward. */}
      <View style={styles.tapZones}>
        <Pressable style={{ flex: 1 }} onPress={() => step(-1)} accessibilityLabel="Previous photo" />
        <Pressable style={{ flex: 1 }} onPress={() => step(1)} accessibilityLabel="Next photo" />
      </View>

      {photos.length > 1 && (
        <View style={styles.bars} pointerEvents="none">
          {photos.map((_, i) => (
            <View key={i} style={[styles.bar, i === current && styles.barActive]} />
          ))}
        </View>
      )}

      <View style={styles.info} pointerEvents="box-none">
        <View style={{ flex: 1 }} pointerEvents="none">
          <View style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>
              {nameLine || "Your name"}
            </Text>
            {user.verified && <Ionicons name="checkmark-circle" size={24} color={colors.blue} />}
          </View>
          {page}
        </View>
        <Pressable style={styles.infoBtn} onPress={onInfo} hitSlop={8} accessibilityLabel="Open full profile">
          <Ionicons name="arrow-up" size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
    ...shadow.card,
  },
  empty: { alignItems: "center", justifyContent: "center", gap: spacing.sm },
  emptyText: { fontSize: font.body, color: colors.textSecondary },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "45%" },
  tapZones: { ...StyleSheet.absoluteFillObject, flexDirection: "row" },
  bars: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: "row",
    gap: 4,
  },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.35)" },
  barActive: { backgroundColor: colors.white },
  info: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.md,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: font.h1, fontWeight: "800", color: colors.white, flexShrink: 1 },
  line: { fontSize: font.body, color: colors.white, fontWeight: "600", marginTop: 4, lineHeight: 20 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm },
  infoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
});
