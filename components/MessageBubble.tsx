import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { radius, spacing, font } from "@/constants/spacing";

interface Props {
  text: string;
  time: string;
  mine: boolean;
}

// Memoized so typing in the chat input doesn't re-render every bubble.
export const MessageBubble = React.memo(function MessageBubble({ text, time, mine }: Props) {
  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowТheirs]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        <Text style={[styles.text, mine && styles.textMine]}>{text}</Text>
      </View>
      <Text style={[styles.time, mine ? styles.timeMine : styles.timeTheirs]}>
        {time}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { marginBottom: spacing.md, maxWidth: "80%" },
  rowMine: { alignSelf: "flex-end", alignItems: "flex-end" },
  rowТheirs: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
  },
  mine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: colors.surfaceAlt, borderBottomLeftRadius: 4 },
  text: { fontSize: font.body, color: colors.text, lineHeight: 20 },
  textMine: { color: colors.white },
  time: { fontSize: font.tiny, color: colors.textTertiary, marginTop: 3 },
  timeMine: { textAlign: "right" },
  timeTheirs: { textAlign: "left" },
});
