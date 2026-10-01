import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Switch, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "@/store/appStore";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Row, SectionTitle } from "@/components/ui";
import { getSecuritySettings, SecuritySettings } from "@/services/api";
import { AUTH_DISABLED } from "@/constants/api";
import { colors } from "@/constants/colors";
import { spacing, font } from "@/constants/spacing";
import { Privacy as PrivacyModel } from "@/models";

const items: { key: keyof PrivacyModel; label: string }[] = [
  { key: "showProfile", label: "Show my profile" },
  { key: "showAge", label: "Show my age" },
  { key: "showDistance", label: "Show my distance" },
  { key: "showOnlineStatus", label: "Show my online status" },
  { key: "allowMatchMessages", label: "Allow messages from matches" },
];

export default function Privacy() {
  const privacy = useAppStore((s) => s.privacy);
  const setPrivacy = useAppStore((s) => s.setPrivacy);
  const [security, setSecurity] = useState<SecuritySettings | null>(null);

  useEffect(() => {
    if (AUTH_DISABLED) return;
    getSecuritySettings().then(setSecurity).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Privacy" />
      <ScrollView>
        <View style={styles.list}>
          {items.map((item) => (
            <Row
              key={item.key}
              label={item.label}
              right={
                <Switch
                  value={privacy[item.key]}
                  onValueChange={(v) => setPrivacy({ [item.key]: v })}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.white}
                />
              }
            />
          ))}
        </View>

        {security && (
          <>
            <SectionTitle>Login security</SectionTitle>
            {security.currentDevice && (
              <Row label="This device" value={security.currentDevice.deviceName} />
            )}
            {security.lastLogin && (
              <Row
                label="Last login"
                value={new Date(security.lastLogin.time).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              />
            )}
            {security.singleDevicePolicy && !!security.policyMessage && (
              <Text style={styles.note}>{security.policyMessage}</Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { marginTop: 8 },
  note: {
    fontSize: font.small,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
});
