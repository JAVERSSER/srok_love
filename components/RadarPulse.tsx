import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { colors } from "@/constants/colors";
import { spacing, font } from "@/constants/spacing";

const AVATAR = 110;
const INNER = AVATAR * 1.7;
const OUTER = AVATAR * 2.35;

type IconName = keyof typeof Ionicons.glyphMap;

const INNER_ICONS: { icon: IconName; color: string; angle: number }[] = [
  { icon: "heart", color: colors.primary, angle: 0 },
  { icon: "chatbubble-ellipses", color: colors.superLike, angle: 120 },
  { icon: "heart", color: colors.primary, angle: 240 },
];
const OUTER_ICONS: { icon: IconName; color: string; angle: number }[] = [
  { icon: "star", color: colors.accent, angle: 45 },
  { icon: "heart", color: colors.pass, angle: 165 },
  { icon: "sparkles", color: colors.accent, angle: 285 },
];

interface Props {
  photo?: string;
  /** true while looking for people; false freezes the orbit and fades it out. */
  searching: boolean;
  searchingTitle?: string;
  /** Shown once searching has stopped. */
  title?: string;
  message?: string;
}

// "Orbit" finder: the user's photo beats like a heart while little icons
// circle it on two counter-rotating rings. Stops when there's no one to find.
export function RadarPulse({
  photo,
  searching,
  searchingTitle = "Finding people near you…",
  title,
  message,
}: Props) {
  const active = useMinDuration(searching, MIN_SEARCH_MS);
  const spin = useSharedValue(0);
  const beat = useSharedValue(1);
  const glow = useSharedValue(0);
  const life = useSharedValue(0);

  useEffect(() => {
    const smooth = Easing.inOut(Easing.sin);
    if (active) {
      cancelAnimation(spin);
      spin.value = spin.value % 360;
      spin.value = withRepeat(
        withTiming(spin.value + 360, { duration: SPIN_MS, easing: Easing.linear }),
        -1,
        false
      );
      // Soft "lub-dub" with eased steps, then a rest.
      beat.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 260, easing: smooth }),
          withTiming(1.01, { duration: 220, easing: smooth }),
          withTiming(1.045, { duration: 240, easing: smooth }),
          withTiming(1, { duration: 480, easing: smooth }),
          withDelay(500, withTiming(1, { duration: 0 }))
        ),
        -1,
        false
      );
      glow.value = withRepeat(withTiming(1, { duration: 1700, easing: smooth }), -1, true);
      life.value = withTiming(1, { duration: 500, easing: smooth });
    } else {
      cancelAnimation(spin);
      cancelAnimation(beat);
      cancelAnimation(glow);
      // Ease-out-cubic starts at 3·d/T deg/ms; matching the spin speed means
      // the orbit decelerates with no visible jump.
      const decel = 1500;
      spin.value = withTiming(spin.value + (360 / SPIN_MS) * decel / 3, {
        duration: decel,
        easing: Easing.out(Easing.cubic),
      });
      beat.value = withTiming(1, { duration: 400, easing: smooth });
      glow.value = withTiming(0, { duration: 600, easing: smooth });
      life.value = withTiming(0, { duration: 1200, easing: smooth });
    }
  }, [active]);

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: beat.value }],
    opacity: 0.6 + 0.4 * life.value,
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: (0.12 + 0.18 * glow.value) * life.value,
    transform: [{ scale: 1 + 0.12 * glow.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        <Orbit size={OUTER} items={OUTER_ICONS} spin={spin} life={life} direction={-1} />
        <Orbit size={INNER} items={INNER_ICONS} spin={spin} life={life} direction={1} />
        <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />
        <Animated.View style={[styles.avatarWrap, avatarStyle]}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]} />
          )}
        </Animated.View>
      </View>
      {active ? (
        <Text style={styles.title}>{searchingTitle}</Text>
      ) : (
        <>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </>
      )}
    </View>
  );
}

function Orbit({
  size,
  items,
  spin,
  life,
  direction,
}: {
  size: number;
  items: { icon: IconName; color: string; angle: number }[];
  spin: SharedValue<number>;
  life: SharedValue<number>;
  direction: 1 | -1;
}) {
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * direction}deg` }],
  }));
  // Counter-rotate each icon so it stays upright while orbiting.
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-spin.value * direction}deg` }],
    opacity: 0.2 + 0.8 * life.value,
  }));
  const r = size / 2;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.orbit, { width: size, height: size, borderRadius: r }, ringStyle]}
    >
      {items.map(({ icon, color, angle }, i) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <Animated.View
            key={i}
            style={[
              styles.chip,
              { left: r + r * Math.cos(rad) - CHIP / 2, top: r + r * Math.sin(rad) - CHIP / 2 },
              iconStyle,
            ]}
          >
            <Ionicons name={icon} size={16} color={color} />
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

const CHIP = 32;
const SPIN_MS = 10000;
// Keep the search visible long enough to read as "searching", even when the
// API answers instantly.
const MIN_SEARCH_MS = 1800;

function useMinDuration(on: boolean, minMs: number) {
  const [value, setValue] = useState(on);
  const startedAt = useRef(on ? Date.now() : 0);

  useEffect(() => {
    if (on) {
      startedAt.current = Date.now();
      setValue(true);
      return;
    }
    const left = minMs - (Date.now() - startedAt.current);
    if (left <= 0) {
      setValue(false);
      return;
    }
    const t = setTimeout(() => setValue(false), left);
    return () => clearTimeout(t);
  }, [on, minMs]);

  return value;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
  },
  stage: {
    width: OUTER + CHIP,
    height: OUTER + CHIP,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  orbit: {
    position: "absolute",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  chip: {
    position: "absolute",
    width: CHIP,
    height: CHIP,
    borderRadius: CHIP / 2,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    // A border instead of shadow/elevation: shadows on rotating views are
    // re-rasterised every frame and stutter on Android.
    borderWidth: 1,
    borderColor: colors.border,
  },
  glow: {
    position: "absolute",
    width: AVATAR + 24,
    height: AVATAR + 24,
    borderRadius: (AVATAR + 24) / 2,
    backgroundColor: colors.primary,
  },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 4,
    borderColor: colors.white,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
  },
  avatar: { width: "100%", height: "100%" },
  avatarFallback: { backgroundColor: colors.border },
  title: {
    fontSize: font.h3,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  message: {
    fontSize: font.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
