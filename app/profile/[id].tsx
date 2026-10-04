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
  Share,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ExpoLinking from "expo-linking";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/store/appStore";
import { InterestTag } from "@/components/InterestTag";
import { EmptyState } from "@/components/EmptyState";
import { PhotoPreview } from "@/components/PhotoPreview";
import { PreviewCard } from "@/components/PreviewCard";
import { ProfileMenuSheet } from "@/components/ProfileMenuSheet";
import { nameAndAge, locationLabel } from "@/components/ProfileCard";
import { colors } from "@/constants/colors";
import { spacing, font, radius, shadow } from "@/constants/spacing";
import { ReportReason, galleryOf, telegramUrl, facebookUrl } from "@/models";
import { ageFromDob } from "@/services/api";

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
  const myPhotos = useAppStore((s) => s.myPhotos);
  const user = isPreview ? me : getUserById(id);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  // Which photo the big top photo shows; tap its sides to move through them.
  const [heroIndex, setHeroIndex] = useState(0);
  // Your own preview opens as a Tinder-style card; ⓘ expands it to the full profile.
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const shareProfile = async () => {
    const url =
      Platform.OS === "web" ? `${window.location.origin}/profile/${user.id}` : ExpoLinking.createURL(`/profile/${user.id}`);
    const message = `Check out ${user.name} on SrokLove! ${url}`;
    // Desktop browsers without a share sheet: copy the link instead.
    if (Platform.OS === "web" && !navigator.share) {
      await navigator.clipboard?.writeText(url).catch(() => {});
      window.alert("Link copied.");
      return;
    }
    // Throws if the person closes the share sheet; nothing to do then.
    await Share.share({ message, url, title: user.name }).catch(() => {});
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

  // Every basic fact on the profile. Your own preview also lists the empty ones
  // ("Not added") so you can see what's missing; other people only see filled ones.
  const hideAge = isPreview && !privacy.showAge;
  const age = user.dateOfBirth ? ageFromDob(user.dateOfBirth) : user.age;
  const basics: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string }[] = [
    { icon: "calendar-outline", label: "Birthday", value: hideAge ? undefined : formatDob(user.dateOfBirth) },
    { icon: "hourglass-outline", label: "Age", value: hideAge || !(age > 0) ? undefined : `${age} years old` },
    { icon: user.gender === "female" ? "female" : "male", label: "Gender", value: user.gender && (user.gender === "female" ? "Woman" : "Man") },
    { icon: "location-outline", label: "Lives in", value: [user.city, user.location].filter(Boolean).join(", ") || undefined },
    { icon: "resize-outline", label: "Height", value: user.height },
    { icon: "briefcase-outline", label: "Work", value: user.occupation },
    { icon: "school-outline", label: "Education", value: user.education },
    { icon: "heart-outline", label: "Looking for", value: user.relationshipGoal },
  ];
  // Height has no input in the app yet, so it's never listed as missing.
  const shownBasics = basics.filter((b) => b.value || (isPreview && b.label !== "Height"));

  // Profile sections. Photos only show in the top photo; tap its sides to move through them.
  const sections: React.ReactNode[] = [
    (!!user.bio || isPreview) && (
      <Section key="about" title="About me">
        {user.bio ? <Text style={styles.paragraph}>{user.bio}</Text> : <Text style={styles.missing}>Not added</Text>}
      </Section>
    ),
    shownBasics.length > 0 && (
      <Section key="basics" title="Basics">
        {shownBasics.map((b) => (
          <Detail key={b.label} icon={b.icon} label={b.label} text={b.value} />
        ))}
      </Section>
    ),
    (user.interests.length > 0 || isPreview) && (
      <Section key="interests" title="Interests">
        {user.interests.length ? (
          <View style={styles.interests}>
            {user.interests.map((i) => (
              <InterestTag key={i} label={i} />
            ))}
          </View>
        ) : (
          <Text style={styles.missing}>Not added</Text>
        )}
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
  ].filter(Boolean);

  // Your own preview follows your privacy switches, like other people would see it.
  const nameLine = isPreview && !privacy.showAge ? user.name : nameAndAge(user);
  const locLine = isPreview && !privacy.showDistance ? "" : locationLabel(user);

  // Your own preview shows your "My Photos" gallery, never the round avatar.
  const photos = isPreview ? myPhotos.map((p) => p.url) : galleryOf(user);
  const hero = Math.min(heroIndex, Math.max(0, photos.length - 1));
  const stepHero = (by: number) => setHeroIndex(Math.max(0, Math.min(photos.length - 1, hero + by)));

  if (isPreview && !expanded) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.cardHeader}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.cardTitle}>Preview</Text>
          <Pressable onPress={() => router.push("/edit-profile")} hitSlop={10}>
            <Text style={styles.cardEdit}>Edit</Text>
          </Pressable>
        </View>
        <View style={styles.cardWrap}>
          <PreviewCard
            user={user}
            photos={photos}
            nameLine={nameLine}
            locLine={locLine}
            onInfo={() => {
              setHeroIndex(0);
              setExpanded(true);
            }}
          />
        </View>
        <Text style={styles.cardNote}>This is how other people see your profile.</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.photoWrap}>
          {/* The main photo: tap the right side for the next photo, the left side to go back. */}
          {photos.length ? (
            <Image source={{ uri: photos[hero] }} style={styles.photo} contentFit="cover" transition={150} />
          ) : (
            <View style={[styles.photo, styles.noPhoto]}>
              <Ionicons name="images-outline" size={48} color={colors.textTertiary} />
              {isPreview && <Text style={styles.noPhotoText}>Add photos in My Photos</Text>}
            </View>
          )}
          {photos.length > 1 ? (
            <View style={styles.tapZones}>
              <Pressable style={{ flex: 1 }} onPress={() => stepHero(-1)} accessibilityLabel="Previous photo" />
              <Pressable style={{ flex: 1 }} onPress={() => stepHero(1)} accessibilityLabel="Next photo" />
            </View>
          ) : (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => photos.length && setPreviewIndex(0)}
              accessibilityLabel="View photo full screen"
            />
          )}
          {photos.length > 1 && (
            <>
              {hero > 0 && (
                <Pressable style={[styles.arrow, { left: spacing.md }]} onPress={() => stepHero(-1)} hitSlop={8}>
                  <Ionicons name="chevron-back" size={22} color={colors.white} />
                </Pressable>
              )}
              {hero < photos.length - 1 && (
                <Pressable style={[styles.arrow, { right: spacing.md }]} onPress={() => stepHero(1)} hitSlop={8}>
                  <Ionicons name="chevron-forward" size={22} color={colors.white} />
                </Pressable>
              )}
            </>
          )}
          {isPreview ? (
            <Pressable style={styles.collapseBtn} onPress={() => setExpanded(false)} accessibilityLabel="Back to card">
              <Ionicons name="arrow-down" size={22} color={colors.white} />
            </Pressable>
          ) : photos.length > 1 && (
            <Pressable style={styles.countPill} onPress={() => setPreviewIndex(hero)}>
              <Ionicons name="images-outline" size={14} color={colors.white} />
              <Text style={styles.countText}>{hero + 1} / {photos.length}</Text>
            </Pressable>
          )}
          <SafeAreaView style={styles.topBar} edges={["top"]} pointerEvents="box-none">
            {photos.length > 1 && (
              <View style={styles.bars} pointerEvents="none">
                {photos.map((_, i) => (
                  <View key={i} style={[styles.bar, i === hero && styles.barActive]} />
                ))}
              </View>
            )}
            {/* Holds the bars' place; the buttons themselves are pinned in topButtons below. */}
            <View style={[styles.iconBtn, { backgroundColor: "transparent" }]} />
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{nameLine}</Text>
            {user.verified && (
              <Ionicons name="checkmark-circle" size={22} color={colors.blue} />
            )}
          </View>
          {!!locLine && <Text style={styles.loc}>📍 {locLine}</Text>}

          {sections}

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

      {!isPreview && (
        <ProfileMenuSheet
          visible={menuOpen}
          name={user.name}
          onClose={() => setMenuOpen(false)}
          onShare={shareProfile}
          onPass={isMatch ? undefined : doPass}
        />
      )}

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

      {/* Pinned above the ⋯ menu so Back still works while it's open. */}
      <SafeAreaView style={[styles.topBar, styles.topButtons]} edges={["top"]} pointerEvents="box-none">
        <IconBtn icon="chevron-back" onPress={() => (isPreview ? setExpanded(false) : router.back())} />
        {isPreview ? (
          <View style={styles.previewPill}>
            <Text style={styles.previewText}>Preview</Text>
          </View>
        ) : (
          <IconBtn icon="ellipsis-horizontal" onPress={() => setMenuOpen((open) => !open)} />
        )}
      </SafeAreaView>
    </View>
  );
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

function Detail({ icon, label, text }: { icon: keyof typeof Ionicons.glyphMap; label: string; text?: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailText, !text && styles.missing]}>{text || "Not added"}</Text>
    </View>
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2001-03-12" → "12 March 2001". */
function formatDob(dob?: string): string | undefined {
  const m = dob?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return undefined;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  photoWrap: { height: 460, backgroundColor: colors.surfaceAlt },
  photo: { ...StyleSheet.absoluteFillObject },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cardTitle: { fontSize: font.title, fontWeight: "700", color: colors.text },
  cardEdit: { fontSize: font.body, fontWeight: "700", color: colors.primary },
  cardWrap: { flex: 1, paddingHorizontal: spacing.md },
  cardNote: {
    textAlign: "center",
    fontSize: font.small,
    color: colors.textSecondary,
    paddingVertical: spacing.md,
  },
  collapseBtn: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    zIndex: 2,
    ...shadow.card,
  },
  tapZones: { ...StyleSheet.absoluteFillObject, flexDirection: "row" },
  arrow: {
    position: "absolute",
    top: "50%",
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  bars: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: -spacing.md,
    flexDirection: "row",
    gap: 4,
  },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.4)" },
  barActive: { backgroundColor: colors.white },
  noPhoto: { alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.surfaceAlt },
  noPhotoText: { fontSize: font.body, color: colors.textSecondary },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  topButtons: { position: "absolute", top: 0, left: 0, right: 0 },
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
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  detailLabel: { width: 96, fontSize: font.body, color: colors.textSecondary },
  detailText: { flex: 1, fontSize: font.body, color: colors.text, fontWeight: "600" },
  missing: { fontSize: font.body, color: colors.textTertiary, fontStyle: "italic", fontWeight: "400" },
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
