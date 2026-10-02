import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/store/appStore";
import { InterestTag } from "@/components/InterestTag";
import { EmptyState } from "@/components/EmptyState";
import { PhotoPreview } from "@/components/PhotoPreview";
import { nameAndAge, locationLabel } from "@/components/ProfileCard";
import { colors } from "@/constants/colors";
import { spacing, font, radius, shadow } from "@/constants/spacing";
import { ReportReason, galleryOf, telegramUrl, facebookUrl } from "@/models";

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
  const isMatch = useAppStore((s) => s.matches.some((m) => m.matchedUserId === id));

  // "/profile/me" previews your own profile exactly as other people see it.
  const isPreview = id === "me";
  const me = useAppStore((s) => s.currentUser);
  const privacy = useAppStore((s) => s.privacy);
  const user = isPreview ? me : getUserById(id);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState emoji="🚫" title="Profile unavailable" message="This user is no longer available." />
      </SafeAreaView>
    );
  }

  // A match shows the MatchModal on the discover screen via lastMatch.
  const doLike = () => {
    likeUser(user.id).catch(() => {});
    router.back();
  };
  const doPass = () => {
    passUser(user.id).catch(() => {});
    router.back();
  };

  const confirmBlock = () => {
    const doBlock = () => {
      blockUser(user.id);
      router.back();
    };
    // Alert.alert's buttons don't show on web.
    if (Platform.OS === "web") {
      if (window.confirm(`Block ${user.name}? They will be removed from Swipe and Matches.`)) doBlock();
      return;
    }
    Alert.alert(
      "Block " + user.name + "?",
      "They will be removed from Swipe and Matches, and you won't be able to message each other.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: doBlock,
        },
      ]
    );
  };

  const openReport = () => {
    if (Platform.OS === "web") {
      const choice = window.prompt(
        `Why are you reporting ${user.name}? Enter a number:\n` +
          reportReasons.map((r, i) => `${i + 1}. ${r}`).join("\n")
      );
      const reason = reportReasons[Number(choice) - 1];
      if (!reason) return;
      reportUser(user.id, reason);
      window.alert("Thank you. Your report has been submitted.");
      return;
    }
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

  // Profile sections, with the rest of the photos placed between them so the
  // profile reads like a story instead of a photo followed by a wall of text.
  const sections: React.ReactNode[] = [
    !!user.bio && (
      <Section key="about" title="About me">
        <Text style={styles.paragraph}>{user.bio}</Text>
      </Section>
    ),
    !!(user.occupation || user.education || user.height) && (
      <Section key="details" title="Details">
        {user.occupation ? <Detail icon="briefcase-outline" text={user.occupation} /> : null}
        {user.education ? <Detail icon="school-outline" text={user.education} /> : null}
        {user.height ? <Detail icon="resize-outline" text={user.height} /> : null}
      </Section>
    ),
    user.interests.length > 0 && (
      <Section key="interests" title="Interests">
        <View style={styles.interests}>
          {user.interests.map((i) => (
            <InterestTag key={i} label={i} />
          ))}
        </View>
      </Section>
    ),
    !!(user.telegram || user.facebook) && (
      <Section key="socials" title="Socials">
        {isMatch || isPreview ? (
          <View style={styles.socials}>
            {user.telegram ? (
              <SocialBtn icon="paper-plane" color="#229ED9" label={`@${user.telegram}`} url={telegramUrl(user.telegram)} />
            ) : null}
            {user.facebook ? (
              <SocialBtn icon="logo-facebook" color="#1877F2" label="Facebook" url={facebookUrl(user.facebook)} />
            ) : null}
          </View>
        ) : (
          <View style={styles.locked}>
            <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
            <Text style={styles.lockedText}>Match with {user.name || "them"} to see their socials.</Text>
          </View>
        )}
      </Section>
    ),
    !!user.relationshipGoal && (
      <Section key="goal" title="Relationship">
        <Text style={styles.paragraph}>Looking for: {user.relationshipGoal}.</Text>
      </Section>
    ),
  ].filter(Boolean);

  // Your own preview follows your privacy switches, like other people would see it.
  const nameLine = isPreview && !privacy.showAge ? user.name : nameAndAge(user);
  const locLine = isPreview && !privacy.showDistance ? "" : locationLabel(user);

  const photos = galleryOf(user);
  const extraPhotos = photos.slice(1).map((uri, i) => (
    <Pressable
      key={`photo-${i}`}
      onPress={() => setPreviewIndex(i + 1)}
      accessibilityLabel={`View photo ${i + 2} full screen`}
    >
      <Image source={{ uri }} style={styles.inlinePhoto} contentFit="cover" transition={150} />
    </Pressable>
  ));

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.photoWrap}>
          {/* The main photo; tap any photo to open the full-screen gallery. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => photos.length && setPreviewIndex(0)}
            accessibilityLabel="View photos full screen"
          >
            <Image source={{ uri: photos[0] }} style={styles.photo} contentFit="cover" transition={150} />
          </Pressable>
          {photos.length > 1 && (
            <Pressable style={styles.countPill} onPress={() => setPreviewIndex(0)}>
              <Ionicons name="images-outline" size={14} color={colors.white} />
              <Text style={styles.countText}>{photos.length} photos</Text>
            </Pressable>
          )}
          <SafeAreaView style={styles.topBar} edges={["top"]}>
            <IconBtn icon="chevron-back" onPress={() => router.back()} />
            {isPreview ? (
              <View style={styles.previewPill}>
                <Text style={styles.previewText}>Preview</Text>
              </View>
            ) : (
              <IconBtn icon="ellipsis-horizontal" onPress={openReport} />
            )}
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{nameLine}</Text>
            {user.verified && (
              <Ionicons name="checkmark-circle" size={22} color={colors.superLike} />
            )}
          </View>
          {!!locLine && <Text style={styles.loc}>📍 {locLine}</Text>}

          {interleave(sections, extraPhotos)}

          {isPreview ? (
            <Text style={styles.previewNote}>This is how other people see your profile.</Text>
          ) : (
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
          )}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <PhotoPreview photos={photos} index={previewIndex} onClose={() => setPreviewIndex(null)} />

      <SafeAreaView style={styles.actionBar} edges={["bottom"]}>
        {isPreview ? (
          <Pressable style={styles.editPill} onPress={() => router.push("/edit-profile")}>
            <Ionicons name="create-outline" size={18} color={colors.white} />
            <Text style={styles.editPillText}>Edit Profile</Text>
          </Pressable>
        ) : isMatch ? (
          <Pressable style={[styles.circle, styles.likeCircle]} onPress={() => router.push(`/chat/${user.id}`)}>
            <Ionicons name="chatbubble" size={28} color={colors.white} />
          </Pressable>
        ) : (
          <>
            <Pressable style={[styles.circle, styles.passCircle]} onPress={doPass}>
              <Ionicons name="close" size={30} color={colors.pass} />
            </Pressable>
            <Pressable style={[styles.circle, styles.likeCircle]} onPress={doLike}>
              <Ionicons name="heart" size={30} color={colors.white} />
            </Pressable>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

/** Section, photo, section, photo… with any leftover photos at the end. */
function interleave(sections: React.ReactNode[], photos: React.ReactNode[]): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const n = Math.max(sections.length, photos.length);
  for (let i = 0; i < n; i++) {
    if (sections[i]) out.push(sections[i]);
    if (photos[i]) out.push(photos[i]);
  }
  return out;
}

function SocialBtn({
  icon,
  color,
  label,
  url,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  url: string;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      style={({ pressed }) => [styles.socialBtn, { backgroundColor: color }, pressed && { opacity: 0.8 }]}
      onPress={() => Linking.openURL(url).catch(() => {})}
    >
      <Ionicons name={icon} size={18} color={colors.white} />
      <Text style={styles.socialText}>{label}</Text>
    </Pressable>
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
  previewPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.sm,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  previewText: { color: colors.white, fontWeight: "700", fontSize: font.small },
  previewNote: {
    textAlign: "center",
    color: colors.textTertiary,
    fontSize: font.small,
    marginTop: spacing.xxl,
  },
  editPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  editPillText: { color: colors.white, fontWeight: "700", fontSize: font.body },
  socials: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  socialText: { color: colors.white, fontWeight: "700", fontSize: font.body },
  locked: { flexDirection: "row", alignItems: "center", gap: 6 },
  lockedText: { fontSize: font.body, color: colors.textSecondary },
  inlinePhoto: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.surfaceAlt,
  },
  countPill: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  countText: { color: colors.white, fontSize: font.small, fontWeight: "700" },
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
