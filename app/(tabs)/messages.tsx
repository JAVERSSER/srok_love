import React from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "@/store/appStore";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { EmptyState } from "@/components/EmptyState";
import { colors } from "@/constants/colors";
import { spacing, font } from "@/constants/spacing";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Messages() {
  const router = useRouter();
  const matches = useAppStore((s) => s.matches);
  const getUserById = useAppStore((s) => s.getUserById);
  const messages = useAppStore((s) => s.messages);
  const getConversation = useAppStore((s) => s.getConversation);

  // Only matches with at least one message show as conversations.
  const convos = matches
    .map((m) => getUserById(m.matchedUserId))
    .filter((u): u is NonNullable<typeof u> => !!u)
    .map((u) => ({ user: u, convo: getConversation(u.id) }))
    .filter((c) => c.convo.length > 0)
    .sort((a, b) => {
      const la = a.convo[a.convo.length - 1].createdAt;
      const lb = b.convo[b.convo.length - 1].createdAt;
      return lb.localeCompare(la);
    });

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
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => {
          const last = item.convo[item.convo.length - 1];
          return (
            <Pressable style={styles.row} onPress={() => router.push(`/chat/${item.user.id}`)}>
              <ProfilePhoto uri={item.user.photos[0]} size={58} />
              <View style={styles.info}>
                <View style={styles.topLine}>
                  <Text style={styles.name}>{item.user.name}</Text>
                  <Text style={styles.time}>{formatTime(last.createdAt)}</Text>
                </View>
                <Text style={styles.preview} numberOfLines={1}>
                  {last.senderId === "me" ? "You: " : ""}
                  {last.text}
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
  preview: { fontSize: font.body, color: colors.textSecondary, marginTop: 2 },
});
