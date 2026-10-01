import React, { useEffect } from "react";
import { View, Text, StyleSheet, Modal, Pressable } from "react-native";
import { ProfilePhoto } from "./ProfilePhoto";
import { UserProfile, avatarOf } from "@/models";
import { colors } from "@/constants/colors";
import { radius, spacing, font } from "@/constants/spacing";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface Props {
  match: UserProfile | null;
  mePhoto: string;
  onMessage: () => void;
  onKeepDiscovering: () => void;
}

export function MatchModal({ match, mePhoto, onMessage, onKeepDiscovering }: Props) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (match) {
      scale.value = withSpring(1, { damping: 12 });
      opacity.value = withTiming(1, { duration: 250 });
    } else {
      scale.value = 0.6;
      opacity.value = 0;
    }
  }, [match]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Modal visible={!!match} transparent animationType="fade">
      <View style={styles.backdrop}>
        <Animated.View style={[styles.content, animStyle]}>
          <Text style={styles.hearts}>❤️ ❤️</Text>
          <Text style={styles.title}>It&apos;s a Match!</Text>
          <Text style={styles.subtitle}>
            You and {match?.name} liked each other.
          </Text>

          <View style={styles.photos}>
            <ProfilePhoto uri={mePhoto} size={92} style={styles.leftPhoto} />
            <ProfilePhoto
              uri={avatarOf(match)}
              size={92}
              style={styles.rightPhoto}
            />
          </View>

          <Pressable style={styles.primaryBtn} onPress={onMessage}>
            <Text style={styles.primaryText}>Send Message</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={onKeepDiscovering}>
            <Text style={styles.secondaryText}>Keep Swiping</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20,0,10,0.86)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  content: { alignItems: "center", width: "100%" },
  hearts: { fontSize: 34, marginBottom: spacing.md },
  title: { fontSize: 40, fontWeight: "900", color: colors.white },
  subtitle: {
    fontSize: font.body,
    color: "rgba(255,255,255,0.85)",
    marginTop: spacing.sm,
    textAlign: "center",
  },
  photos: {
    flexDirection: "row",
    marginVertical: spacing.xxl,
  },
  leftPhoto: {
    borderWidth: 3,
    borderColor: colors.white,
    marginRight: -14,
    zIndex: 2,
  },
  rightPhoto: { borderWidth: 3, borderColor: colors.white },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
    width: "100%",
    alignItems: "center",
  },
  primaryText: { color: colors.white, fontWeight: "800", fontSize: font.title },
  secondaryBtn: { paddingVertical: spacing.lg, marginTop: spacing.xs },
  secondaryText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: font.body,
  },
});
