import React, { useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "@/store/appStore";
import { colors } from "@/constants/colors";
import { spacing, font } from "@/constants/spacing";
import { PrimaryButton, GhostButton } from "@/components/ui";

const { width } = Dimensions.get("window");

const steps = [
  {
    emoji: "🧭",
    title: "Discover people around you",
    text: "Browse profiles of people near you across Cambodia.",
  },
  {
    emoji: "💖",
    title: "Find someone you like",
    text: "Swipe right to like, left to pass, up to super like.",
  },
  {
    emoji: "💬",
    title: "Match and start chatting",
    text: "When you both like each other, it's a match. Say hello!",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const setOnboarded = useAppStore((s) => s.setOnboarded);

  const finish = () => {
    setOnboarded(true);
    router.replace("/create-profile");
  };

  const next = () => {
    if (index < steps.length - 1) setIndex(index + 1);
    else finish();
  };

  const step = steps[index];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.top}>
        <GhostButton label="Skip" onPress={finish} color={colors.textSecondary} />
      </View>

      <View style={styles.body}>
        <Text style={styles.emoji}>{step.emoji}</Text>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.text}>{step.text}</Text>
      </View>

      <View style={styles.dots}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label={index === steps.length - 1 ? "Get Started" : "Next"}
          onPress={next}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  top: { alignItems: "flex-end" },
  body: { flex: 1, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 90, marginBottom: spacing.xl },
  title: {
    fontSize: font.h2,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  text: {
    fontSize: font.title,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.primary, width: 22 },
  footer: { paddingBottom: spacing.md },
});
