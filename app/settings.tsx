import React, { useState } from "react";
import { Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "@/store/appStore";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SettingsGroup, SettingsItem, confirmLogout } from "@/components/SettingsList";
import { SupportSheet } from "@/components/SupportSheet";
import { colors } from "@/constants/colors";
import { spacing, font } from "@/constants/spacing";

export default function Settings() {
  const router = useRouter();
  const user = useAppStore((s) => s.currentUser);
  const account = useAppStore((s) => s.account);
  const pref = useAppStore((s) => s.preference);
  const privacy = useAppStore((s) => s.privacy);
  const blockedCount = useAppStore((s) => s.blocked.length);
  const unread = useAppStore((s) => s.notifications.filter((n) => !n.read).length);
  const logout = useAppStore((s) => s.logout);
  const [supportOpen, setSupportOpen] = useState(false);

  const hiddenCount = Object.values(privacy).filter((v) => !v).length;

  const doLogout = () =>
    confirmLogout(() => {
      logout();
      router.replace("/");
    });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Settings" />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        <SettingsGroup title="Account">
          <SettingsItem
            icon="person-outline"
            label="Edit Profile"
            subtitle={user.name || "Add your name, bio and interests"}
            onPress={() => router.push("/edit-profile")}
          />
          <SettingsItem
            icon="images-outline"
            color={colors.accent}
            label="My Photos"
            subtitle={`${user.photos.length} photo${user.photos.length === 1 ? "" : "s"}`}
            onPress={() => router.push("/my-photos")}
          />
          <SettingsItem
            icon="key-outline"
            color={colors.textSecondary}
            label="Change Password"
            subtitle={account?.username ? `Signed in as @${account.username}` : undefined}
            onPress={() => router.push("/change-password")}
          />
        </SettingsGroup>

        <SettingsGroup title="Discovery">
          <SettingsItem
            icon="options-outline"
            color={colors.blue}
            label="Swipe Preferences"
            subtitle={`Ages ${pref.ageMin}–${pref.ageMax} · within ${pref.distanceKm} km`}
            onPress={() => router.push("/preferences")}
          />
        </SettingsGroup>

        <SettingsGroup title="Notifications & Privacy">
          <SettingsItem
            icon="notifications-outline"
            color={colors.accent}
            label="Notifications"
            subtitle={unread ? `${unread} unread` : "You're all caught up"}
            badge={unread}
            onPress={() => router.push("/notifications")}
          />
          <SettingsItem
            icon="lock-closed-outline"
            color={colors.success}
            label="Privacy"
            subtitle={
              !privacy.showProfile
                ? "Your profile is hidden"
                : hiddenCount
                  ? `${hiddenCount} setting${hiddenCount === 1 ? "" : "s"} turned off`
                  : "Everything visible"
            }
            onPress={() => router.push("/privacy")}
          />
        </SettingsGroup>

        <SettingsGroup title="Safety & Support">
          <SettingsItem
            icon="shield-checkmark-outline"
            color={colors.danger}
            label="Safety & Blocked Users"
            subtitle={blockedCount ? `${blockedCount} blocked` : "Safety tips"}
            onPress={() => router.push("/safety")}
          />
          <SettingsItem
            icon="help-circle-outline"
            color={colors.blue}
            label="Help & Support"
            subtitle="Contact us on Telegram or Facebook"
            onPress={() => setSupportOpen(true)}
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsItem icon="log-out-outline" label="Log out" danger onPress={doLogout} />
        </SettingsGroup>

        <Text style={styles.version}>SrokLove • Demo v1.0</Text>
      </ScrollView>

      <SupportSheet visible={supportOpen} onClose={() => setSupportOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  version: {
    textAlign: "center",
    color: colors.textTertiary,
    fontSize: font.small,
    marginTop: spacing.xl,
  },
});
