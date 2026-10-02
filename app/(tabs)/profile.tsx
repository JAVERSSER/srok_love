import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore, MAX_PHOTOS } from "@/store/appStore";
import { InterestTag } from "@/components/InterestTag";
import { Row, SectionTitle } from "@/components/ui";
import { colors } from "@/constants/colors";
import { spacing, font, radius, shadow } from "@/constants/spacing";
import { useTabBarSpace } from "@/components/GlassTabBar";
import { pickAvatarImage } from "@/components/AvatarPicker";
import { PhotoPreview } from "@/components/PhotoPreview";
import { SupportSheet } from "@/components/SupportSheet";
import { ageFromDob } from "@/services/api";

export default function Profile() {
  const tabBarSpace = useTabBarSpace();
  const router = useRouter();
  const user = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);
  const setProfilePhoto = useAppStore((s) => s.setProfilePhoto);
  // The full-screen viewer shows either the avatar alone or the photo gallery.
  const [preview, setPreview] = useState<{ photos: string[]; index: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const photo = user.avatar;
  // Worked out from the date of birth each render, so it goes up on the birthday.
  const age = user.dateOfBirth ? ageFromDob(user.dateOfBirth) : user.age;

  const changePhoto = async () => {
    if (uploading) return;
    setPhotoError(null);
    try {
      const image = await pickAvatarImage();
      if (!image) return;
      setUploading(true);
      await setProfilePhoto(image);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Couldn't upload your photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const doLogout = () => {
    logout();
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: tabBarSpace + spacing.lg }}>
        <View style={styles.hero}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => router.push("/settings")}
            hitSlop={8}
            style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </Pressable>
          <View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={photo ? "Preview profile photo" : "Add profile photo"}
              onPress={() => (photo ? setPreview({ photos: [photo], index: 0 }) : changePhoto())}
              disabled={uploading}
              style={({ pressed }) => pressed && { opacity: 0.85 }}
            >
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatar} contentFit="cover" transition={200} />
              ) : (
                <View style={[styles.avatar, styles.avatarEmpty]}>
                  <Ionicons name="person" size={48} color={colors.textTertiary} />
                </View>
              )}
              {uploading && (
                <View style={[styles.avatar, styles.avatarBusy]}>
                  <ActivityIndicator color={colors.white} />
                </View>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={photo ? "Change profile photo" : "Add profile photo"}
              onPress={changePhoto}
              disabled={uploading}
              hitSlop={8}
              style={styles.cameraBtn}
            >
              <Ionicons name={photo ? "camera" : "add"} size={16} color={colors.white} />
            </Pressable>
          </View>
          {photoError ? <Text style={styles.photoError}>{photoError}</Text> : null}
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {user.name || "Your profile"}
              {age > 0 ? `, ${age}` : ""}
            </Text>
            {user.verified && (
              <Ionicons name="checkmark-circle" size={20} color={colors.superLike} />
            )}
          </View>
          <Text style={styles.loc}>📍 {user.location}</Text>
          <View style={styles.heroBtns}>
            <Pressable style={styles.editBtn} onPress={() => router.push("/edit-profile")}>
              <Ionicons name="create-outline" size={18} color={colors.primary} />
              <Text style={styles.editText}>Edit Profile</Text>
            </Pressable>
            <Pressable style={[styles.editBtn, styles.previewBtn]} onPress={() => router.push("/profile/me")}>
              <Text style={[styles.editText, { color: colors.white }]}>Preview</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.white} />
            </Pressable>
          </View>
        </View>

        <View style={styles.photosBox}>
          <SectionTitle style={{ marginHorizontal: 0 }}>My Photos</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
            {user.photos.map((uri, i) => (
              <Pressable key={uri + i} onPress={() => setPreview({ photos: user.photos, index: i })} accessibilityLabel={`Preview photo ${i + 1}`}>
                <Image source={{ uri }} style={styles.thumb} contentFit="cover" transition={150} />
              </Pressable>
            ))}
            {user.photos.length < MAX_PHOTOS && (
              <Pressable
                style={[styles.thumb, styles.addThumb]}
                onPress={() => router.push("/my-photos")}
                accessibilityLabel="Add photos"
              >
                <Ionicons name="add" size={30} color={colors.primary} />
              </Pressable>
            )}
          </ScrollView>
          <Text style={styles.photosHint}>Get up to 2x more likes with 6 pics.</Text>
        </View>

        {!!user.bio && (
          <View style={styles.bioBox}>
            <Text style={styles.bio}>{user.bio}</Text>
          </View>
        )}

        {user.interests.length > 0 && (
          <View style={styles.interestsBox}>
            <SectionTitle style={{ marginHorizontal: 0 }}>Interests</SectionTitle>
            <View style={styles.interests}>
              {user.interests.map((i) => (
                <InterestTag key={i} label={i} />
              ))}
            </View>
          </View>
        )}

        <View style={[styles.menu, { marginTop: spacing.lg }]}>
          <Row label="Help & Support" onPress={() => setSupportOpen(true)} right={<Chevron />} />
          <Row label="Logout" danger onPress={doLogout} />
        </View>

        <Text style={styles.version}>SrokLove • Demo v1.0</Text>
      </ScrollView>

      <PhotoPreview
        photos={preview?.photos ?? []}
        index={preview?.index ?? null}
        onClose={() => setPreview(null)}
        // Only the avatar can be swapped from here; the gallery has its own screen.
        onChangeMain={preview?.photos.length === 1 && preview.photos[0] === photo ? changePhoto : undefined}
      />

      <SupportSheet visible={supportOpen} onClose={() => setSupportOpen(false)} />
    </SafeAreaView>
  );
}

function Chevron() {
  return <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  hero: {
    alignItems: "center",
    backgroundColor: colors.background,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  settingsBtn: {
    position: "absolute",
    top: spacing.md,
    right: spacing.lg,
    zIndex: 1,
    padding: spacing.xs,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.surfaceAlt,
    ...shadow.soft,
  },
  avatarEmpty: { alignItems: "center", justifyContent: "center" },
  avatarBusy: {
    position: "absolute",
    top: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.overlay,
  },
  cameraBtn: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.background,
  },
  photoError: {
    color: colors.danger,
    fontSize: font.small,
    marginTop: spacing.sm,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md },
  name: { fontSize: font.h2, fontWeight: "800", color: colors.text },
  loc: { fontSize: font.body, color: colors.textSecondary, marginTop: 2 },
  heroBtns: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  previewBtn: { backgroundColor: colors.primary },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  editText: { color: colors.primary, fontWeight: "700", fontSize: font.body },
  photosBox: {
    backgroundColor: colors.background,
    marginTop: spacing.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  strip: { gap: 4, marginTop: spacing.sm },
  thumb: {
    width: 84,
    height: 112,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  addThumb: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  photosHint: { fontSize: font.small, color: colors.textSecondary, marginTop: spacing.md },
  bioBox: {
    backgroundColor: colors.background,
    marginTop: spacing.md,
    padding: spacing.xl,
  },
  bio: { fontSize: font.body, color: colors.text, lineHeight: 22 },
  interestsBox: {
    backgroundColor: colors.background,
    marginTop: spacing.md,
    padding: spacing.xl,
  },
  interests: { flexDirection: "row", flexWrap: "wrap", marginTop: spacing.sm },
  menu: {
    backgroundColor: colors.background,
    marginTop: spacing.sm,
    borderRadius: 0,
  },
  version: {
    textAlign: "center",
    color: colors.textTertiary,
    fontSize: font.small,
    marginTop: spacing.xl,
  },
});
