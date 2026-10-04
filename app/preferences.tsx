import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "@/store/appStore";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SectionTitle } from "@/components/ui";
import { colors } from "@/constants/colors";
import { spacing, font, radius } from "@/constants/spacing";

const distances = [5, 10, 25, 50, 100];

export default function Preferences() {
  const pref = useAppStore((s) => s.preference);
  const setPreference = useAppStore((s) => s.setPreference);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Swipe Preferences" />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <SectionTitle>Age range</SectionTitle>
        <View style={styles.box}>
          <Text style={styles.value}>
            {pref.ageMin} – {pref.ageMax}
          </Text>
          <View style={styles.stepperRow}>
            <Stepper
              label="Min"
              value={pref.ageMin}
              onDec={() => setPreference({ ageMin: Math.max(18, pref.ageMin - 1) })}
              onInc={() => setPreference({ ageMin: Math.min(pref.ageMax, pref.ageMin + 1) })}
            />
            <Stepper
              label="Max"
              value={pref.ageMax}
              onDec={() => setPreference({ ageMax: Math.max(pref.ageMin, pref.ageMax - 1) })}
              onInc={() => setPreference({ ageMax: Math.min(80, pref.ageMax + 1) })}
            />
          </View>
        </View>

        <SectionTitle>Maximum distance</SectionTitle>
        <View style={styles.rowWrap}>
          {distances.map((d) => (
            <Chip
              key={d}
              label={`${d} km`}
              active={pref.distanceKm === d}
              onPress={() => setPreference({ distanceKm: d })}
            />
          ))}
        </View>

        <Text style={styles.note}>
          Distance is measured from your phone's location. People whose age or gender
          isn't shared are still shown.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Stepper({
  label,
  value,
  onDec,
  onInc,
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable style={styles.stepBtn} onPress={onDec}>
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable style={styles.stepBtn} onPress={onInc}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: spacing.lg },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontWeight: "600", fontSize: font.small },
  chipTextActive: { color: colors.primaryDark },
  box: { paddingHorizontal: spacing.lg },
  value: { fontSize: font.h3, fontWeight: "800", color: colors.primary, marginBottom: spacing.md },
  stepperRow: { flexDirection: "row", gap: spacing.lg },
  stepper: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md },
  stepperLabel: { fontSize: font.small, color: colors.textSecondary, marginBottom: spacing.sm },
  stepperControls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBtnText: { fontSize: 20, color: colors.primary, fontWeight: "700" },
  stepValue: { fontSize: font.title, fontWeight: "700", color: colors.text },
  note: {
    fontSize: font.small,
    color: colors.textTertiary,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
});
