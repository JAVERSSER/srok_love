import React, { useEffect } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
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
  const clearNotifications = useAppStore((s) => s.clearNotifications);

  useEffect(() => {
    markRead();
  }, [markRead]);

  const confirmClear = () => {
    // Alert.alert's buttons don't show on web.
    if (Platform.OS === "web") {
      if (window.confirm("Clear all notifications?")) clearNotifications();
      return;
    }
    Alert.alert("Clear all notifications?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clearNotifications },
    ]);
  };

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
      <ScreenHeader
        title="Notifications"
        right={
          <Pressable onPress={confirmClear} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear all notifications">
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        }
      />
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
  clear: { fontSize: font.body, color: colors.primary, fontWeight: "600" },
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
