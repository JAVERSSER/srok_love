import React from "react";
import { View, Text, StyleSheet, Modal, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";
import { spacing, font, radius } from "@/constants/spacing";

const SUPPORT_CHANNELS = [
  {
    key: "telegram",
    label: "Telegram",
    subtitle: "@hengthirith",
    icon: "paper-plane" as const,
    color: "#229ED9",
    url: "https://t.me/hengthirith",
  },
  {
    key: "facebook",
    label: "Facebook",
    subtitle: "Thyrith Heng",
    icon: "logo-facebook" as const,
    color: "#1877F2",
    url: "https://www.facebook.com/thyrith.heng",
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function SupportSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();

  const open = async (url: string) => {
    onClose();
    try {
      await Linking.openURL(url);
    } catch {
      // Nothing to fall back to; the link opens in the browser when the app isn't installed.
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>Help & Support</Text>
          <Text style={styles.subtitle}>Contact us through one of these channels.</Text>

          {SUPPORT_CHANNELS.map((c) => (
            <Pressable
              key={c.key}
              accessibilityRole="link"
              accessibilityLabel={`Contact support on ${c.label}`}
              onPress={() => open(c.url)}
              style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: c.color }]}>
                <Ionicons name={c.icon} size={22} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionLabel}>{c.label}</Text>
                <Text style={styles.optionSub}>{c.subtitle}</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textTertiary} />
            </Pressable>
          ))}

          <Pressable onPress={onClose} style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
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
  title: { fontSize: font.title, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: font.small, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.lg },
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
  optionSub: { fontSize: font.small, color: colors.textSecondary, marginTop: 1 },
  cancel: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
  },
  cancelText: { fontSize: font.body, fontWeight: "700", color: colors.text },
});
