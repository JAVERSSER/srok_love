import React from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/store/appStore";
import { EmptyState } from "@/components/EmptyState";
import { nameAndAge, locationLabel } from "@/components/ProfileCard";
import { colors } from "@/constants/colors";
import { spacing, font, radius, shadow } from "@/constants/spacing";
import { useTabBarSpace } from "@/components/GlassTabBar";
import { galleryOf } from "@/models";

export default function Likes() {
  const tabBarSpace = useTabBarSpace();
  const router = useRouter();
  const likes = useAppStore((s) => s.likes);
  const getUserById = useAppStore((s) => s.getUserById);
  const matches = useAppStore((s) => s.matches);

  const likedUsers = likes
    .filter((l) => l.userId === "me")
    .map((l) => ({ user: getUserById(l.targetId), superLike: l.superLike }))
    .filter((x) => x.user);

  if (likedUsers.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Header />
        <EmptyState
          emoji="❤️"
          title="No likes yet"
          message="Start swiping to find someone special."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Header />
      <FlatList
        data={likedUsers}
        keyExtractor={(item) => item.user!.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={[styles.grid, { paddingBottom: tabBarSpace }]}
        renderItem={({ item }) => {
          const u = item.user!;
          const isMatch = matches.some((m) => m.matchedUserId === u.id);
          return (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/profile/${u.id}`)}
            >
              <Image source={{ uri: galleryOf(u)[0] }} style={styles.photo} contentFit="cover" />
              <View style={styles.overlay}>
                <Text style={styles.name}>{nameAndAge(u)}</Text>
                {!!locationLabel(u) && <Text style={styles.loc}>{locationLabel(u)}</Text>}
              </View>
              <View style={styles.badge}>
                <Ionicons
                  name={isMatch ? "sparkles" : item.superLike ? "star" : "heart"}
                  size={14}
                  color={colors.white}
                />
                <Text style={styles.badgeText}>
                  {isMatch ? "Match" : item.superLike ? "Super" : "Liked"}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Likes</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  title: { fontSize: font.h2, fontWeight: "800", color: colors.text },
  grid: { padding: spacing.lg, gap: spacing.md },
  card: {
    flex: 1,
    aspectRatio: 0.72,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
    ...shadow.soft,
  },
  photo: { ...StyleSheet.absoluteFillObject },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  name: { color: colors.white, fontWeight: "800", fontSize: font.body },
  loc: { color: colors.white, fontSize: font.small, opacity: 0.9 },
  badge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { color: colors.white, fontSize: font.tiny, fontWeight: "700" },
});
