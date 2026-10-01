import React, { useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "@/store/appStore";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { EmptyState } from "@/components/EmptyState";
import { colors } from "@/constants/colors";
import { spacing, font } from "@/constants/spacing";
import { useTabBarSpace } from "@/components/GlassTabBar";
import { avatarOf } from "@/models";

// Today: the time. Earlier: the date.
function formatTime(iso: string) {
  const d = new Date(iso);
  if (d.toDateString() === new Date().toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

export default function Messages() {
  const tabBarSpace = useTabBarSpace();
  const router = useRouter();
  const conversations = useAppStore((s) => s.conversations);
  const blocked = useAppStore((s) => s.blocked);
  const getUserById = useAppStore((s) => s.getUserById);

  useFocusEffect(
    useCallback(() => {
      useAppStore.getState().refreshChats().catch(() => {});
    }, [])
  );

  // Only rooms with at least one message show as conversations.
  const blockedIds = new Set(blocked.map((b) => b.userId));
  const convos = conversations
    .filter((c) => c.lastMessage && !blockedIds.has(c.otherUserId))
    .map((c) => ({ convo: c, user: getUserById(c.otherUserId) }))
    .filter((c): c is { convo: typeof c.convo; user: NonNullable<typeof c.user> } => !!c.user)
    .sort((a, b) => (b.convo.lastActivity ?? "").localeCompare(a.convo.lastActivity ?? ""));

  if (convos.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Header />
        <EmptyState
          emoji="💬"
          title="No messages yet"
          message="Start a conversation with one of your matches."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Header />
      <FlatList
        data={convos}
        keyExtractor={(c) => c.user.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: tabBarSpace }}
        renderItem={({ item: { convo, user } }) => {
          const unread = convo.unread > 0;
          return (
            <Pressable style={styles.row} onPress={() => router.push(`/chat/${user.id}`)}>
              <ProfilePhoto uri={avatarOf(user)} size={58} />
              <View style={styles.info}>
                <View style={styles.topLine}>
                  <Text style={styles.name}>{user.name}</Text>
                  {convo.lastActivity ? (
                    <Text style={styles.time}>{formatTime(convo.lastActivity)}</Text>
                  ) : null}
                </View>
                <View style={styles.topLine}>
                  <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
                    {convo.lastMessage}
                  </Text>
                  {unread && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{convo.unread}</Text>
                    </View>
                  )}
                </View>
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
      <Text style={styles.title}>Messages</Text>
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
  topLine: { flexDirection: "row", justifyContent: "space-between" },
  name: { fontSize: font.title, fontWeight: "700", color: colors.text },
  time: { fontSize: font.small, color: colors.textTertiary },
  preview: { flex: 1, fontSize: font.body, color: colors.textSecondary, marginTop: 2 },
  previewUnread: { color: colors.text, fontWeight: "700" },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
  badgeText: { color: colors.white, fontSize: font.tiny, fontWeight: "700" },
});
