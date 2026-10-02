import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "@/store/appStore";
import { colors } from "@/constants/colors";
import { spacing, font } from "@/constants/spacing";
import { PrimaryButton, GhostButton } from "@/components/ui";
import { AUTH_DISABLED } from "@/constants/api";

export default function Welcome() {
  const router = useRouter();
  const onboarded = useAppStore((s) => s.onboarded);
  const loggedIn = useAppStore((s) => s.loggedIn);
  const skipAuth = useAppStore((s) => s.skipAuth);
  const signedOutReason = useAppStore((s) => s.signedOutReason);

  // Logged in with a profile: go straight to the app. Registered but no
  // profile yet (e.g. the app was closed mid sign-up): finish the profile.
  useEffect(() => {
    if (!loggedIn) return;
    router.replace(onboarded ? "/(tabs)/discover" : "/create-profile");
  }, [onboarded, loggedIn]);

  const getStarted = () => router.push("/onboarding");

  const login = () => {
    if (AUTH_DISABLED) {
      skipAuth();
      router.replace("/(tabs)/discover");
      return;
    }
    router.push("/login");
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoHeart}>❤️</Text>
          </View>
          <Text style={styles.appName}>SrokLove</Text>
          <Text style={styles.tagline}>Meet someone special in Cambodia.</Text>
          <Text style={styles.khmer}>ស្វែងរកនរណាម្នាក់ពិសេសនៅកម្ពុជា</Text>
        </View>

        {signedOutReason ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{signedOutReason}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton label="Get Started" onPress={getStarted} />
          <GhostButton label="Log In" onPress={login} color={colors.white} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  safe: { flex: 1, justifyContent: "space-between", padding: spacing.xl },
  hero: { flex: 1, alignItems: "center", justifyContent: "center" },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  logoHeart: { fontSize: 60 },
  appName: {
    fontSize: 46,
    fontWeight: "900",
    color: colors.white,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: font.title,
    color: "rgba(255,255,255,0.95)",
    marginTop: spacing.md,
    textAlign: "center",
  },
  khmer: {
    fontSize: font.body,
    color: "rgba(255,255,255,0.8)",
    marginTop: spacing.sm,
    textAlign: "center",
  },
  notice: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noticeText: { color: colors.white, fontSize: font.small, textAlign: "center", lineHeight: 20 },
  actions: { gap: spacing.sm, paddingBottom: spacing.lg },
});
