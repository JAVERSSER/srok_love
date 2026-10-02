import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Row } from "@/components/ui";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";

export default function Settings() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Settings" />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.menu}>
          <Row label="Edit Profile" onPress={() => router.push("/edit-profile")} right={<Chevron />} />
          <Row label="Swipe Preferences" onPress={() => router.push("/preferences")} right={<Chevron />} />
          <Row label="Notifications" onPress={() => router.push("/notifications")} right={<Chevron />} />
          <Row label="Privacy" onPress={() => router.push("/privacy")} right={<Chevron />} />
          <Row label="Change Password" onPress={() => router.push("/change-password")} right={<Chevron />} />
          <Row label="Safety & Blocked Users" onPress={() => router.push("/safety")} right={<Chevron />} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Chevron() {
  return <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  menu: {
    backgroundColor: colors.background,
    marginTop: spacing.sm,
  },
});
