import React from "react";
import { View, StyleSheet, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "@/store/appStore";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Row } from "@/components/ui";
import { colors } from "@/constants/colors";
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Privacy" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { marginTop: 8 },
});
