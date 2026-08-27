import React from "react";
import {
  Text,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import { colors } from "@/constants/colors";
import { radius, spacing, font, shadow } from "@/constants/spacing";

export function PrimaryButton({
  label,
  onPress,
  style,
  disabled,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  style,
  color = colors.primary,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
  color?: string;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.ghost, style]}>
      <Text style={[styles.ghostLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({
  label,
  value,
  onPress,
  danger,
  right,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.rowPressed : null]}
    >
      <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>
        {label}
      </Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {right}
      </View>
    </Pressable>
  );
}

export function SectionTitle({ children, style }: { children: string; style?: TextStyle }) {
  return <Text style={[styles.section, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  pressed: { opacity: 0.85 },
  disabled: { backgroundColor: colors.textTertiary },
  primaryLabel: { color: colors.white, fontWeight: "800", fontSize: font.title },
  ghost: { paddingVertical: spacing.md, alignItems: "center" },
  ghostLabel: { fontWeight: "700", fontSize: font.body },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.soft,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  rowLabel: { fontSize: font.body, color: colors.text, fontWeight: "600" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowValue: { fontSize: font.body, color: colors.textSecondary },
  section: {
    fontSize: font.small,
    fontWeight: "700",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
  },
});
