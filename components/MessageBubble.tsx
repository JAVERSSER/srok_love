import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { radius, spacing, font } from "@/constants/spacing";

// Where a bubble sits within a run of consecutive messages from one sender.
export type BubblePosition = "single" | "first" | "middle" | "last";

interface Props {
  text: string;
  mine: boolean;
  position: BubblePosition;
  // Shown under the last bubble of a group only.
  time?: string;
  // Shown on my most recent message.
  sent?: boolean;
  // Fade/slide in; used for messages that just arrived.
  animateIn?: boolean;
}

// Memoized so typing in the chat input doesn't re-render every bubble.
export const MessageBubble = React.memo(function MessageBubble({
  text,
  mine,
  position,
  time,
  sent,
  animateIn,
}: Props) {
  const progress = useRef(new Animated.Value(animateIn ? 0 : 1)).current;

  useEffect(() => {
    if (!animateIn) return;
    Animated.timing(progress, {
      toValue: 1,
      duration: 180,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [animateIn, progress]);

  const joinedAbove = position === "middle" || position === "last";
  const endsGroup = position === "single" || position === "last";

  return (
    <Animated.View
      style={[
        styles.row,
        mine ? styles.rowMine : styles.rowTheirs,
        { marginBottom: endsGroup ? spacing.md : 2 },
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.bubble,
          mine ? styles.mine : styles.theirs,
          // Square off the corners that touch the neighbouring bubble so a
          // group reads as one block.
          joinedAbove && (mine ? styles.mineJoinedAbove : styles.theirsJoinedAbove),
        ]}
      >
        <Text style={[styles.text, mine && styles.textMine]}>{text}</Text>
      </View>
      {(time || sent) && (
        <View style={[styles.meta, mine && styles.metaMine]}>
          {time && <Text style={styles.time}>{time}</Text>}
          {sent && <Ionicons name="checkmark" size={12} color={colors.textTertiary} />}
        </View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: { maxWidth: "80%" },
  rowMine: { alignSelf: "flex-end", alignItems: "flex-end" },
  rowTheirs: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
  },
  mine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: colors.surfaceAlt, borderBottomLeftRadius: 4 },
  mineJoinedAbove: { borderTopRightRadius: 4 },
  theirsJoinedAbove: { borderTopLeftRadius: 4 },
  text: { fontSize: font.body, color: colors.text, lineHeight: 20 },
  textMine: { color: colors.white },
  meta: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  metaMine: { justifyContent: "flex-end" },
  time: { fontSize: font.tiny, color: colors.textTertiary },
});
