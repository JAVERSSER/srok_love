import React, { useEffect } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "@/store/appStore";
import { ScreenHeader } from "@/components/ScreenHeader";
import { EmptyState } from "@/components/EmptyState";
import { colors } from "@/constants/colors";
import { spacing, font } from "@/constants/spacing";

const iconFor: Record<string, string> = {
  like: "❤️",
  message: "💬",
  match: "🎉",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600_000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Notifications() {
  const notifications = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markNotificationsRead);

  useEffect(() => {
    markRead();
  }, [markRead]);

  if (notifications.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScreenHeader title="Notifications" />
        <EmptyState emoji="🔔" title="No notifications" message="You're all caught up." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Notifications" />
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ paddingVertical: spacing.sm }}
        renderItem={({ item }) => (
          <View style={[styles.row, !item.read && styles.unread]}>
            <Text style={styles.icon}>{iconFor[item.type] ?? "🔔"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.text}>{item.text}</Text>
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  unread: { backgroundColor: colors.primarySoft },
  icon: { fontSize: 26 },
  text: { fontSize: font.body, color: colors.text, fontWeight: "600" },
  time: { fontSize: font.small, color: colors.textTertiary, marginTop: 2 },
});
