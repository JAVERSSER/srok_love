import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing, font } from "@/constants/spacing";

interface Props {
  emoji: string;
  title: string;
  message: string;
}

export function EmptyState({ emoji, title, message }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
  },
  emoji: { fontSize: 56, marginBottom: spacing.lg },
  title: {
    fontSize: font.h3,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: font.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
