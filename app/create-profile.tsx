import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "@/store/appStore";
import { AUTH_DISABLED } from "@/constants/api";
import { colors } from "@/constants/colors";
import { spacing, font, radius } from "@/constants/spacing";
import { PrimaryButton } from "@/components/ui";
import { InterestTag } from "@/components/InterestTag";
import { AvatarPicker, pickAvatarImage } from "@/components/AvatarPicker";
import {
  provinces,
  genderOptions,
  lookingForOptions,
  interestOptions,
  relationshipGoals,
} from "@/constants/provinces";
import { Gender } from "@/models";

export default function CreateProfile() {
  const router = useRouter();
  const updateCurrentUser = useAppStore((s) => s.updateCurrentUser);
  const skipAuth = useAppStore((s) => s.skipAuth);
  const photo = useAppStore((s) => s.pendingPhoto);
  const setPhoto = useAppStore((s) => s.setPendingPhoto);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [lookingFor, setLookingFor] = useState<(typeof lookingForOptions)[number] | null>(null);
  const [province, setProvince] = useState("");
  const [bio, setBio] = useState("");
  const [occupation, setOccupation] = useState("");
  const [education, setEducation] = useState("");
  const [goal, setGoal] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  const toggleInterest = (i: string) =>
    setInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );

  const pickPhoto = async () => {
    const image = await pickAvatarImage();
    if (image) setPhoto(image);
  };

  const valid =
    name.trim().length > 1 &&
    Number(age) >= 18 &&
    !!gender &&
    !!lookingFor &&
    !!province &&
    !!goal;

  const save = () => {
    if (!valid || !gender || !lookingFor) return;
    updateCurrentUser({
      name: name.trim(),
      age: Number(age),
      gender,
      lookingFor,
      location: province,
      bio: bio.trim(),
      occupation,
      education,
      relationshipGoal: goal,
      interests,
    });
    if (AUTH_DISABLED) {
      skipAuth();
      router.replace("/(tabs)/discover");
      return;
    }
    // Profile is saved; next step is creating login credentials.
    router.push("/sign-up");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>Create your profile</Text>
        <Text style={styles.sub}>Tell us a little about yourself.</Text>

        <AvatarPicker uri={photo?.uri} onPick={pickPhoto} onRemove={() => setPhoto(null)} />

        <Label text="Full name" />
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Sreyneang"
          placeholderTextColor={colors.textTertiary}
        />

        <Label text="Age" />
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          placeholder="25"
          placeholderTextColor={colors.textTertiary}
        />

        <Label text="Gender" />
        <Chips
          options={genderOptions.map((g) => (g === "male" ? "Male" : "Female"))}
          value={gender === "male" ? "Male" : gender === "female" ? "Female" : ""}
          onSelect={(v) => setGender(v === "Male" ? "male" : "female")}
        />

        <Label text="Looking for" />
        <Chips
          options={[...lookingForOptions]}
          value={lookingFor ?? ""}
          onSelect={(v) => setLookingFor(v as typeof lookingFor)}
        />

        <Label text="Province" />
        <Chips options={provinces} value={province} onSelect={setProvince} wrap />

        <Label text="Short bio" />
        <TextInput
          style={[styles.input, styles.textarea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Love coffee & travel..."
          placeholderTextColor={colors.textTertiary}
          multiline
        />

        <Label text="Occupation" />
        <TextInput
          style={styles.input}
          value={occupation}
          onChangeText={setOccupation}
          placeholder="e.g. Designer"
          placeholderTextColor={colors.textTertiary}
        />

        <Label text="Education" />
        <TextInput
          style={styles.input}
          value={education}
          onChangeText={setEducation}
          placeholder="e.g. RUPP"
          placeholderTextColor={colors.textTertiary}
        />

        <Label text="Relationship intention" />
        <Chips options={relationshipGoals} value={goal} onSelect={setGoal} wrap />

        <Label text="Interests" />
        <View style={styles.interests}>
          {interestOptions.map((i) => (
            <InterestTag
              key={i}
              label={i}
              selected={interests.includes(i)}
              onPress={() => toggleInterest(i)}
            />
          ))}
        </View>

        <PrimaryButton
          label="Start Discovering"
          onPress={save}
          disabled={!valid}
          style={{ marginTop: spacing.xl }}
        />
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
  wrap,
}: {
  options: string[];
  value: string;
  onSelect: (v: string) => void;
  wrap?: boolean;
}) {
  return (
    <View style={[styles.chips, wrap && { flexWrap: "wrap" }]}>
      {options.map((o) => {
        const active = o === value;
        return (
          <Pressable
            key={o}
            onPress={() => onSelect(o)}
            style={[styles.chip, active && styles.chipActive]}
          >
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
  header: { fontSize: font.h2, fontWeight: "800", color: colors.text },
  sub: { fontSize: font.body, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg },
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
  chips: { flexDirection: "row", gap: 8 },
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
