import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/store/appStore";
import { ProfileCard, SwipeDir } from "@/components/ProfileCard";
import { MatchModal } from "@/components/MatchModal";
import { RadarPulse } from "@/components/RadarPulse";
import { colors } from "@/constants/colors";
import { spacing, font, shadow, radius } from "@/constants/spacing";
import { useTabBarSpace } from "@/components/GlassTabBar";
import { avatarOf } from "@/models";

export default function Discover() {
  const tabBarSpace = useTabBarSpace();
  const router = useRouter();
  const getDiscoverQueue = useAppStore((s) => s.getDiscoverQueue);
  const likeUser = useAppStore((s) => s.likeUser);
  const passUser = useAppStore((s) => s.passUser);
  const lastMatch = useAppStore((s) => s.lastMatch);
  const clearLastMatch = useAppStore((s) => s.clearLastMatch);
  const currentUser = useAppStore((s) => s.currentUser);
  const unreadNotifs = useAppStore((s) => s.notifications.filter((n) => !n.read).length);

  const refreshDiscover = useAppStore((s) => s.refreshDiscover);

  // Re-derive queue when the server list, likes/passes/blocked change.
  const users = useAppStore((s) => s.users);
  const discoverIds = useAppStore((s) => s.discoverIds);
  const likes = useAppStore((s) => s.likes);
  const passes = useAppStore((s) => s.passes);
  const matches = useAppStore((s) => s.matches);
  const blocked = useAppStore((s) => s.blocked);
  const preference = useAppStore((s) => s.preference);

  const queue = useMemo(
    () => getDiscoverQueue(),
    [users, discoverIds, likes, passes, matches, blocked, preference, getDiscoverQueue]
  );

  const [tick, setTick] = useState(0); // force refresh after action
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await refreshDiscover();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load profiles.");
    } finally {
      setLoading(false);
    }
  }, [refreshDiscover]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSwipe = (dir: SwipeDir, id: string) => {
    // The card leaves right away; the swipe is sent in the background and a
    // match pops up the MatchModal through lastMatch.
    const sent = dir === "left" ? passUser(id) : likeUser(id);
    sent.catch((e) => setError(e instanceof Error ? e.message : "Couldn't send your swipe."));
    setTick((t) => t + 1);
  };

  const top = queue[0];
  const next = queue[1];

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: tabBarSpace }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Swipe</Text>
        <Pressable onPress={() => router.push("/notifications")} hitSlop={10} accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={26} color={colors.text} />
          {unreadNotifs > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadNotifs > 9 ? "9+" : unreadNotifs}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.deck}>
        {queue.length === 0 ? (
          <RadarPulse
            photo={avatarOf(currentUser)}
            searching={loading}
            title="No profiles yet"
            message={
              error ??
              (discoverIds.length > 0
                ? `${discoverIds.length} nearby ${discoverIds.length === 1 ? "person is" : "people are"} hidden because you already swiped them or they're outside your age, gender or distance preferences.`
                : "There's no one nearby right now. Check back later or adjust your preferences.")
            }
          />
        ) : (
          <>
            {next && (
              <View style={styles.behind} pointerEvents="none">
                <ProfileCard user={next} isTop={false} onSwipe={() => {}} onTap={() => {}} />
              </View>
            )}
            {top && (
              <ProfileCard
                key={top.id + tick}
                user={top}
                isTop
                onSwipe={(dir) => handleSwipe(dir, top.id)}
                onTap={() => router.push(`/profile/${top.id}`)}
              />
            )}
          </>
        )}
      </View>

      {queue.length > 0 && top && (
        <View style={styles.actions}>
          <View style={styles.dock}>
            <ActionBtn
              icon="close"
              label="Pass"
              variant="pass"
              onPress={() => handleSwipe("left", top.id)}
            />
            <ActionBtn
              icon="person-outline"
              label="View profile"
              variant="info"
              onPress={() => router.push(`/profile/${top.id}`)}
            />
            <ActionBtn
              icon="heart"
              label="Like"
              variant="like"
              onPress={() => handleSwipe("right", top.id)}
            />
          </View>
        </View>
      )}

      <MatchModal
        match={lastMatch}
        mePhoto={avatarOf(currentUser)}
        onMessage={() => {
          const id = lastMatch?.id;
          clearLastMatch();
          if (id) router.push(`/chat/${id}`);
        }}
        onKeepDiscovering={clearLastMatch}
      />
    </SafeAreaView>
  );
}

function ActionBtn({
  icon,
  label,
  variant,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  variant: "pass" | "like" | "info";
  onPress: () => void;
}) {
  const v = variants[variant];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionBtn, v.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={v.iconSize} color={v.iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  title: { fontSize: font.h2, fontWeight: "800", color: colors.text },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  bellBadgeText: { color: colors.white, fontSize: 10, fontWeight: "800" },
  deck: {
    flex: 1,
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  behind: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ scale: 0.96 }, { translateY: 12 }],
  },
  actions: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  dock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { transform: [{ scale: 0.9 }], opacity: 0.85 },
});

const variants = {
  pass: {
    iconSize: 30,
    iconColor: colors.pass,
    button: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.white,
      borderWidth: 2,
      borderColor: colors.primarySoft,
      ...shadow.soft,
    },
  },
  info: {
    iconSize: 20,
    iconColor: colors.textSecondary,
    button: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
    },
  },
  like: {
    iconSize: 30,
    iconColor: colors.white,
    button: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.primaryDark,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
  },
} as const;
