import React from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/store/appStore";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { EmptyState } from "@/components/EmptyState";
import { SectionTitle } from "@/components/ui";
import { colors } from "@/constants/colors";
import { spacing, font, radius } from "@/constants/spacing";
import { avatarOf } from "@/models";

export default function Safety() {
  const blocked = useAppStore((s) => s.blocked);
  const getUserById = useAppStore((s) => s.getUserById);
  const unblockUser = useAppStore((s) => s.unblockUser);

  // Fall back to what was saved at block time if they're no longer loaded.
  const blockedUsers = blocked.map((b) => {
    const u = getUserById(b.userId);
    return { id: b.userId, name: u?.name || b.name || "Unknown user", avatar: u ? avatarOf(u) : b.avatar };
  });

  const confirmUnblock = (id: string, name: string) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Unblock ${name}?`)) unblockUser(id);
      return;
    }
    Alert.alert(`Unblock ${name}?`, "They can show up in Swipe and Matches again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Unblock", onPress: () => unblockUser(id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Safety" />
      <View style={styles.tips}>
        <Text style={styles.tipsTitle}>Stay safe on SrokLove</Text>
        <Tip text="Meet in public places for first dates." />
        <Tip text="Don't share financial information." />
        <Tip text="Report and block anyone who makes you uncomfortable." />
      </View>

      <SectionTitle>Blocked users</SectionTitle>
      {blockedUsers.length === 0 ? (
        <EmptyState
          emoji="🛡️"
          title="No blocked users"
          message="Anyone you block will appear here and be hidden from Swipe and Matches."
        />
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <ProfilePhoto uri={item.avatar ?? ""} size={44} />
              <Text style={styles.name}>{item.name}</Text>
              <Pressable
                onPress={() => confirmUnblock(item.id, item.name)}
                style={({ pressed }) => [styles.unblock, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.unblockText}>Unblock</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <View style={styles.tipRow}>
      <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tips: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
  },
  tipsTitle: { fontSize: font.title, fontWeight: "800", color: colors.primaryDark, marginBottom: spacing.md },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm },
  tipText: { fontSize: font.body, color: colors.text, flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  name: { flex: 1, fontSize: font.body, fontWeight: "600", color: colors.text },
  unblock: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unblockText: { fontSize: font.small, fontWeight: "700", color: colors.primary },
});
