import React from "react";
import { View, Text, StyleSheet, Pressable, Platform, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { spacing, font, radius } from "@/constants/spacing";

type IconName = keyof typeof Ionicons.glyphMap;

/** Asks "Log out?" before calling onConfirm (Alert doesn't show on web). */
export function confirmLogout(onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm("Log out of SrokLove?")) onConfirm();
    return;
  }
  Alert.alert("Log out?", "You can log back in any time.", [
    { text: "Cancel", style: "cancel" },
    { text: "Log out", style: "destructive", onPress: onConfirm },
  ]);
}

/** A titled, rounded card that holds a few SettingsItems. */
export function SettingsGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.card}>
        {items.map((child, i) => (
          <View key={i}>
            {i > 0 && <View style={styles.divider} />}
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * One tappable line: a coloured icon, a label with an optional subtitle that
 * shows the current value, and a badge or chevron on the right.
 */
export function SettingsItem({
  icon,
  color = colors.primary,
  label,
  subtitle,
  badge,
  danger,
  onPress,
}: {
  icon: IconName;
  color?: string;
  label: string;
  subtitle?: string;
  badge?: number;
  danger?: boolean;
  onPress: () => void;
}) {
  const tint = danger ? colors.danger : color;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${label}, ${subtitle}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: tint + "1A" }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <View style={styles.texts}>
        <Text style={[styles.label, danger && { color: colors.danger }]}>{label}</Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
      {!danger && <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: spacing.xl, marginHorizontal: spacing.lg },
  groupTitle: {
    fontSize: font.small,
    fontWeight: "700",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  divider: { height: 1, backgroundColor: colors.divider, marginLeft: 68 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 60,
  },
  itemPressed: { backgroundColor: colors.surfaceAlt },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  texts: { flex: 1 },
  label: { fontSize: font.body, fontWeight: "600", color: colors.text },
  subtitle: { fontSize: font.small, color: colors.textSecondary, marginTop: 2 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  badgeText: { color: colors.white, fontSize: font.tiny, fontWeight: "800" },
});
