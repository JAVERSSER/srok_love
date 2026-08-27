import React from "react";
import { Text, StyleSheet, Pressable, View } from "react-native";
import { colors } from "@/constants/colors";
import { radius, spacing, font } from "@/constants/spacing";

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

const emojiMap: Record<string, string> = {
  Coffee: "☕",
  Travel: "✈️",
  Music: "🎵",
  Reading: "📚",
  Cooking: "🍳",
  Movies: "🎬",
  Fitness: "💪",
  Photography: "📷",
  Dancing: "💃",
  Gaming: "🎮",
  Foodie: "🍜",
  Nature: "🌿",
  Art: "🎨",
  Fashion: "👗",
  Volunteering: "🤝",
};

export function InterestTag({ label, selected, onPress }: Props) {
  const emoji = emojiMap[label] ?? "•";
  const content = (
    <View style={[styles.tag, selected && styles.tagSelected]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  emoji: { fontSize: font.body, marginRight: 6 },
  label: { fontSize: font.small, color: colors.textSecondary, fontWeight: "600" },
  labelSelected: { color: colors.primaryDark },
});
