import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";
import { spacing, font, radius } from "@/constants/spacing";

type Props = {
  visible: boolean;
  name: string;
  onClose: () => void;
  onShare: () => void;
  // Left out for matches, which can't be passed.
  onPass?: () => void;
};

/**
 * The ⋯ menu on someone's profile. It's drawn inside the screen rather than in
 * a Modal so the screen can keep its Back button above it.
 */
export function ProfileMenuSheet({ visible, name, onClose, onShare, onPass }: Props) {
  const insets = useSafeAreaInsets();

  const pick = (fn: () => void) => {
    onClose();
    fn();
  };

  if (!visible) return null;

  return (
    <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
      <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]} onPress={() => {}}>
        <View style={styles.handle} />
        <Text style={styles.title}>{name}</Text>

        <Option icon="share-outline" color={colors.blue} label="Share" onPress={() => pick(onShare)} />
        {onPass && <Option icon="close" color={colors.pass} label="Pass" onPress={() => pick(onPass)} />}

        <Pressable onPress={onClose} style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
}

function Option({
  icon,
  color,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: color }]}>
        <Ionicons name={icon} size={22} color={colors.white} />
      </View>
      <Text style={styles.optionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  title: { fontSize: font.title, fontWeight: "800", color: colors.text, marginBottom: spacing.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  iconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  optionLabel: { fontSize: font.body, fontWeight: "700", color: colors.text },
  cancel: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
  },
  cancelText: { fontSize: font.body, fontWeight: "700", color: colors.text },
});
