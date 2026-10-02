import React, { useState } from "react";
import { View, Text, StyleSheet, useWindowDimensions, Pressable } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { UserProfile, galleryOf } from "@/models";
import { ageFromDob } from "@/services/api";
import { colors } from "@/constants/colors";
import { radius, spacing, font, shadow, layout } from "@/constants/spacing";

export type SwipeDir = "left" | "right" | "up";

/** "Name, 24", or just the name when the age isn't known. */
export function nameAndAge(user: UserProfile): string {
  const age = user.dateOfBirth ? ageFromDob(user.dateOfBirth) : user.age;
  return age > 0 ? `${user.name}, ${age}` : user.name;
}

/** The user's city, or how far away they are. */
export function locationLabel(user: UserProfile): string {
  if (user.location) return user.location;
  if (user.distanceKm == null) return "";
  return user.distanceKm < 1 ? "Less than 1 km away" : `${Math.round(user.distanceKm)} km away`;
}

interface Props {
  user: UserProfile;
  onSwipe: (dir: SwipeDir) => void;
  onTap: () => void;
  isTop: boolean;
}

export function ProfileCard({ user, onSwipe, onTap, isTop }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  // The card fills its parent, which is capped at `layout.maxWidth` on
  // tablet/web (see app/_layout.tsx) — measure the card itself via onLayout
  // rather than using the raw window width, so swipe-distance thresholds
  // match what's actually on screen instead of a wide desktop viewport.
  const [width, setWidth] = useState(() => Math.min(windowWidth, layout.maxWidth));
  const SWIPE_THRESHOLD = width * 0.28;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardHeight = useSharedValue(0);
  // Like a real card held in the hand: grabbing the top half tilts it one way,
  // grabbing the bottom half tilts it the opposite way.
  const tiltSign = useSharedValue(1);
  // Grab point relative to the card's center; the card rotates around it so
  // the spot under the finger stays under the finger.
  const pivotX = useSharedValue(0);
  const pivotY = useSharedValue(0);

  const trigger = (dir: SwipeDir) => onSwipe(dir);

  const pan = Gesture.Pan()
    .enabled(isTop)
    .onBegin((e) => {
      tiltSign.value = e.y > cardHeight.value / 2 ? -1 : 1;
      pivotX.value = e.x - width / 2;
      pivotY.value = e.y - cardHeight.value / 2;
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const goRight = e.translationX > SWIPE_THRESHOLD;
      const goLeft = e.translationX < -SWIPE_THRESHOLD;
      const goUp = e.translationY < -SWIPE_THRESHOLD && Math.abs(e.translationX) < SWIPE_THRESHOLD;

      if (goRight) {
        translateX.value = withSpring(width * 1.5);
        runOnJS(trigger)("right");
      } else if (goLeft) {
        translateX.value = withSpring(-width * 1.5);
        runOnJS(trigger)("left");
      } else if (goUp) {
        translateY.value = withSpring(-width * 1.5);
        runOnJS(trigger)("up");
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-width / 2, 0, width / 2],
      [-12, 0, 12],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { translateX: pivotX.value },
        { translateY: pivotY.value },
        { rotateZ: `${rotate * tiltSign.value}deg` },
        { translateX: -pivotX.value },
        { translateY: -pivotY.value },
      ],
    };
  });

  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));
  const passStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));
  const superStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.card, cardStyle]}
        onLayout={(e) => {
          setWidth(e.nativeEvent.layout.width);
          cardHeight.value = e.nativeEvent.layout.height;
        }}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onTap}>
          <Image
            source={{ uri: galleryOf(user)[0] }}
            style={styles.photo}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.gradient} />

          <Animated.View style={[styles.badge, styles.likeBadge, likeStyle]}>
            <Text style={styles.likeText}>LIKE ❤️</Text>
          </Animated.View>
          <Animated.View style={[styles.badge, styles.passBadge, passStyle]}>
            <Text style={styles.passText}>PASS ✕</Text>
          </Animated.View>
          <Animated.View style={[styles.superBadge, superStyle]}>
            <Text style={styles.superText}>SUPER LIKE ⭐</Text>
          </Animated.View>

          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{nameAndAge(user)}</Text>
              {user.verified && (
                <Ionicons name="checkmark-circle" size={20} color={colors.superLike} />
              )}
            </View>
            {!!locationLabel(user) && (
              <View style={styles.locRow}>
                <Ionicons name="location-sharp" size={14} color={colors.white} />
                <Text style={styles.location}>{locationLabel(user)}</Text>
              </View>
            )}
            {!!user.bio && (
              <Text style={styles.bio} numberOfLines={2}>
                &ldquo;{user.bio}&rdquo;
              </Text>
            )}
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
    ...shadow.card,
  },
  photo: { ...StyleSheet.absoluteFillObject },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  info: { position: "absolute", left: spacing.xl, right: spacing.xl, bottom: spacing.xxl },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: font.h1, fontWeight: "800", color: colors.white },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  location: { fontSize: font.body, color: colors.white, fontWeight: "600" },
  bio: { fontSize: font.body, color: colors.white, marginTop: spacing.sm, lineHeight: 20 },
  badge: {
    position: "absolute",
    top: spacing.xxl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 3,
  },
  likeBadge: {
    left: spacing.xl,
    borderColor: colors.like,
    transform: [{ rotate: "-14deg" }],
  },
  passBadge: {
    right: spacing.xl,
    borderColor: colors.pass,
    transform: [{ rotate: "14deg" }],
  },
  likeText: { color: colors.like, fontWeight: "900", fontSize: font.title },
  passText: { color: colors.pass, fontWeight: "900", fontSize: font.title },
  superBadge: {
    position: "absolute",
    alignSelf: "center",
    bottom: "38%",
    borderColor: colors.superLike,
    borderWidth: 3,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  superText: { color: colors.superLike, fontWeight: "900", fontSize: font.title },
});
