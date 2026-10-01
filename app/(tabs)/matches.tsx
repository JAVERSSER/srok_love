import React from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "@/store/appStore";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { EmptyState } from "@/components/EmptyState";
import { colors } from "@/constants/colors";
import { spacing, font } from "@/constants/spacing";
import { useTabBarSpace } from "@/components/GlassTabBar";

export default function Matches() {
  const tabBarSpace = useTabBarSpace();
  const router = useRouter();
  const matches = useAppStore((s) => s.matches);
  const getUserById = useAppStore((s) => s.getUserById);
  const getConversation = useAppStore((s) => s.getConversation);

  const rows = matches
    .map((m) => getUserById(m.matchedUserId))
    .filter((u): u is NonNullable<typeof u> => !!u);

  if (rows.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Header />
        <EmptyState
          emoji="✨"
          title="No matches yet"
          message="Keep swiping. When you and someone like each other, they'll show up here."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Header />
      <FlatList
        data={rows}
        keyExtractor={(u) => u.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: tabBarSpace }}
        renderItem={({ item: u }) => {
          const convo = getConversation(u.id);
          const last = convo[convo.length - 1];
          return (
            <Pressable style={styles.row} onPress={() => router.push(`/chat/${u.id}`)}>
              <ProfilePhoto uri={u.photos[0]} size={60} />
              <View style={styles.info}>
                <Text style={styles.name}>{u.name}</Text>
                <Text style={styles.preview} numberOfLines={1}>
                  {last ? last.text : "You matched! Say hello 👋"}
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
      <Text style={styles.title}>Matches</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  title: { fontSize: font.h2, fontWeight: "800", color: colors.text },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  info: { flex: 1 },
  name: { fontSize: font.title, fontWeight: "700", color: colors.text },
  preview: { fontSize: font.body, color: colors.textSecondary, marginTop: 2 },
});
