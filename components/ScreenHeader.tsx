import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { spacing, font } from "@/constants/spacing";

export function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <Pressable
        // A page opened directly (e.g. refreshed on web) has no history to go back to.
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"))}
        hitSlop={10}
        style={styles.back}
      >
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  back: { width: 40 },
  title: { flex: 1, fontSize: font.title, fontWeight: "700", color: colors.text },
  right: { width: 60, alignItems: "flex-end" },
});
