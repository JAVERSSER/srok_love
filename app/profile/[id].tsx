import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/store/appStore";
import { InterestTag } from "@/components/InterestTag";
import { EmptyState } from "@/components/EmptyState";
import { colors } from "@/constants/colors";
import { spacing, font, radius, shadow } from "@/constants/spacing";
import { ReportReason } from "@/models";

const reportReasons: ReportReason[] = [
  "Harassment",
  "Fake profile",
  "Spam",
  "Inappropriate content",
  "Other",
];

export default function ProfileDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const getUserById = useAppStore((s) => s.getUserById);
  const likeUser = useAppStore((s) => s.likeUser);
  const passUser = useAppStore((s) => s.passUser);
  const blockUser = useAppStore((s) => s.blockUser);
  const reportUser = useAppStore((s) => s.reportUser);

  const user = getUserById(id);
  const [photoIndex, setPhotoIndex] = useState(0);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState emoji="🚫" title="Profile unavailable" message="This user is no longer available." />
      </SafeAreaView>
    );
  }

  const doLike = () => {
    const matched = likeUser(user.id);
    router.back();
    if (matched) {
      // Match modal is shown on the discover screen via lastMatch.
    }
  };
  const doPass = () => {
    passUser(user.id);
    router.back();
  };

  const confirmBlock = () => {
    Alert.alert(
      "Block " + user.name + "?",
      "They will be removed from Discover and Matches, and you won't be able to message each other.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: () => {
            blockUser(user.id);
            router.back();
          },
        },
      ]
    );
  };

  const openReport = () => {
    Alert.alert("Report " + user.name, "Why are you reporting this profile?", [
      ...reportReasons.map((r) => ({
        text: r,
        onPress: () => {
          reportUser(user.id, r);
          Alert.alert("Thank you", "Your report has been submitted.");
        },
      })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.photoWrap}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() =>
              setPhotoIndex((i) => (i + 1) % Math.max(user.photos.length, 1))
            }
          >
            <Image
              source={{ uri: user.photos[photoIndex] }}
              style={styles.photo}
              contentFit="cover"
              transition={150}
            />
          </Pressable>
          <SafeAreaView style={styles.topBar} edges={["top"]}>
            <IconBtn icon="chevron-back" onPress={() => router.back()} />
            <IconBtn icon="ellipsis-horizontal" onPress={openReport} />
          </SafeAreaView>
          {user.photos.length > 1 && (
            <View style={styles.dots}>
              {user.photos.map((_, i) => (
                <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {user.name}, {user.age}
            </Text>
            {user.verified && (
              <Ionicons name="checkmark-circle" size={22} color={colors.superLike} />
            )}
          </View>
          <Text style={styles.loc}>📍 {user.location}</Text>

          <Section title="About me">
            <Text style={styles.paragraph}>{user.bio}</Text>
          </Section>

          {(user.occupation || user.education || user.height) && (
            <Section title="Details">
              {user.occupation ? <Detail icon="briefcase-outline" text={user.occupation} /> : null}
              {user.education ? <Detail icon="school-outline" text={user.education} /> : null}
              {user.height ? <Detail icon="resize-outline" text={user.height} /> : null}
            </Section>
          )}

          {user.interests.length > 0 && (
            <Section title="Interests">
              <View style={styles.interests}>
                {user.interests.map((i) => (
                  <InterestTag key={i} label={i} />
                ))}
              </View>
            </Section>
          )}

          {user.relationshipGoal && (
            <Section title="Relationship">
              <Text style={styles.paragraph}>Looking for: {user.relationshipGoal}.</Text>
            </Section>
          )}

          <View style={styles.safety}>
            <Pressable onPress={openReport} style={styles.safetyBtn}>
              <Ionicons name="flag-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.safetyText}>Report</Text>
            </Pressable>
            <Pressable onPress={confirmBlock} style={styles.safetyBtn}>
              <Ionicons name="ban-outline" size={16} color={colors.danger} />
              <Text style={[styles.safetyText, { color: colors.danger }]}>Block</Text>
            </Pressable>
          </View>
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <SafeAreaView style={styles.actionBar} edges={["bottom"]}>
        <Pressable style={[styles.circle, styles.passCircle]} onPress={doPass}>
          <Ionicons name="close" size={30} color={colors.pass} />
        </Pressable>
        <Pressable style={[styles.circle, styles.likeCircle]} onPress={doLike}>
          <Ionicons name="heart" size={30} color={colors.white} />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function IconBtn({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable style={styles.iconBtn} onPress={onPress} hitSlop={8}>
      <Ionicons name={icon} size={22} color={colors.white} />
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Detail({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <Text style={styles.detailText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  photoWrap: { height: 460, backgroundColor: colors.surfaceAlt },
  photo: { ...StyleSheet.absoluteFillObject },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  dots: {
    position: "absolute",
    bottom: spacing.md,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { backgroundColor: colors.white, width: 18 },
  body: { padding: spacing.xl },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: font.h1, fontWeight: "800", color: colors.text },
  loc: { fontSize: font.body, color: colors.textSecondary, marginTop: 4 },
  section: { marginTop: spacing.xl },
  sectionTitle: {
    fontSize: font.small,
    fontWeight: "700",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  paragraph: { fontSize: font.body, color: colors.text, lineHeight: 22 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  detailText: { fontSize: font.body, color: colors.text },
  interests: { flexDirection: "row", flexWrap: "wrap" },
  safety: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xxl,
    marginTop: spacing.xxl,
  },
  safetyBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  safetyText: { color: colors.textSecondary, fontWeight: "600" },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xxl,
    paddingTop: spacing.md,
    backgroundColor: "transparent",
  },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  passCircle: { backgroundColor: colors.white },
  likeCircle: { backgroundColor: colors.like },
});
