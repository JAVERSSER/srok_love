import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "@/store/appStore";
import { ScreenHeader } from "@/components/ScreenHeader";
import { InterestTag } from "@/components/InterestTag";
import { PrimaryButton } from "@/components/ui";
import { colors } from "@/constants/colors";
import { spacing, font, radius } from "@/constants/spacing";
import { provinces, interestOptions, relationshipGoals } from "@/constants/provinces";

export default function EditProfile() {
  const router = useRouter();
  const user = useAppStore((s) => s.currentUser);
  const update = useAppStore((s) => s.updateCurrentUser);

  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [province, setProvince] = useState(user.location);
  const [occupation, setOccupation] = useState(user.occupation ?? "");
  const [education, setEducation] = useState(user.education ?? "");
  const [goal, setGoal] = useState(user.relationshipGoal ?? relationshipGoals[0]);
  const [interests, setInterests] = useState<string[]>(user.interests);

  const toggle = (i: string) =>
    setInterests((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  const save = () => {
    update({
      name: name.trim() || user.name,
      bio: bio.trim(),
      location: province,
      occupation,
      education,
      relationshipGoal: goal,
      interests,
    });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Edit Profile" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Label text="Name" />
        <TextInput style={styles.input} value={name} onChangeText={setName} />

        <Label text="Bio" />
        <TextInput
          style={[styles.input, styles.textarea]}
          value={bio}
          onChangeText={setBio}
          multiline
        />

        <Label text="Province" />
        <Chips options={provinces} value={province} onSelect={setProvince} />

        <Label text="Occupation" />
        <TextInput style={styles.input} value={occupation} onChangeText={setOccupation} />

        <Label text="Education" />
        <TextInput style={styles.input} value={education} onChangeText={setEducation} />

        <Label text="Relationship intention" />
        <Chips options={relationshipGoals} value={goal} onSelect={setGoal} />

        <Label text="Interests" />
        <View style={styles.interests}>
          {interestOptions.map((i) => (
            <InterestTag key={i} label={i} selected={interests.includes(i)} onPress={() => toggle(i)} />
          ))}
        </View>

        <PrimaryButton label="Save Changes" onPress={save} style={{ marginTop: spacing.xl }} />
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function Chips({
  options,
  value,
  onSelect,
}: {
  options: string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const active = o === value;
        return (
          <Pressable key={o} onPress={() => onSelect(o)} style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl },
  label: {
    fontSize: font.small,
    fontWeight: "700",
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: font.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textarea: { height: 90, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
  interests: { flexDirection: "row", flexWrap: "wrap" },
});
