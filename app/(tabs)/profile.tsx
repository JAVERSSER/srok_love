import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/store/appStore";
import { InterestTag } from "@/components/InterestTag";
import { Row, SectionTitle } from "@/components/ui";
import { colors } from "@/constants/colors";
import { spacing, font, radius, shadow } from "@/constants/spacing";
import { useTabBarSpace } from "@/components/GlassTabBar";

export default function Profile() {
  const tabBarSpace = useTabBarSpace();
  const router = useRouter();
  const user = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);

  const doLogout = () => {
    logout();
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: tabBarSpace + spacing.lg }}>
        <View style={styles.hero}>
          <Image source={{ uri: user.photos[0] }} style={styles.avatar} contentFit="cover" />
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {user.name}, {user.age}
            </Text>
            {user.verified && (
              <Ionicons name="checkmark-circle" size={20} color={colors.superLike} />
            )}
          </View>
          <Text style={styles.loc}>📍 {user.location}</Text>
          <Pressable style={styles.editBtn} onPress={() => router.push("/edit-profile")}>
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={styles.editText}>Edit Profile</Text>
          </Pressable>
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

        <SectionTitle>Settings</SectionTitle>
        <View style={styles.menu}>
          <Row label="Edit Profile" onPress={() => router.push("/edit-profile")} right={<Chevron />} />
          <Row label="Discovery Preferences" onPress={() => router.push("/preferences")} right={<Chevron />} />
          <Row label="Notifications" onPress={() => router.push("/notifications")} right={<Chevron />} />
          <Row label="Privacy" onPress={() => router.push("/privacy")} right={<Chevron />} />
          <Row label="Safety & Blocked Users" onPress={() => router.push("/safety")} right={<Chevron />} />
        </View>

        <View style={[styles.menu, { marginTop: spacing.lg }]}>
          <Row label="Help & Support" onPress={() => {}} right={<Chevron />} />
          <Row label="Logout" danger onPress={doLogout} />
        </View>

        <Text style={styles.version}>SrokLove • Demo v1.0</Text>
      </ScrollView>
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
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.surfaceAlt,
    ...shadow.soft,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md },
  name: { fontSize: font.h2, fontWeight: "800", color: colors.text },
  loc: { fontSize: font.body, color: colors.textSecondary, marginTop: 2 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  editText: { color: colors.primary, fontWeight: "700", fontSize: font.body },
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
