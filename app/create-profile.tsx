import React, { forwardRef, memo, useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TextInputProps,
  Pressable,
  Platform,
  Alert,
  KeyboardAvoidingView,
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
  interestOptions,
  relationshipGoals,
} from "@/constants/provinces";
import { Gender } from "@/models";
import { ageFromDob, formatDob } from "@/services/api";
import { dateOfBirthToIso, formatDateOfBirthInput, validateDateOfBirth } from "@/services/auth";

// Hoisted so the memoized chip rows get stable props and skip re-rendering
// while the user types in the text fields.
const genderLabels = genderOptions.map((g) => (g === "male" ? "Male" : "Female"));

export default function CreateProfile() {
  const router = useRouter();
  const saveProfile = useAppStore((s) => s.saveProfile);
  const skipAuth = useAppStore((s) => s.skipAuth);
  const setOnboarded = useAppStore((s) => s.setOnboarded);
  const uploadPendingPhoto = useAppStore((s) => s.uploadPendingPhoto);
  const photo = useAppStore((s) => s.pendingPhoto);
  // Entered at sign-up; asked for here only if we don't have it yet.
  const savedDob = useAppStore((s) => s.currentUser.dateOfBirth);
  const setPhoto = useAppStore((s) => s.setPendingPhoto);

  const [name, setName] = useState("");
  const [dobInput, setDobInput] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [province, setProvince] = useState("");
  const [bio, setBio] = useState("");
  const [occupation, setOccupation] = useState("");
  const [education, setEducation] = useState("");
  const [goal, setGoal] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const dobRef = useRef<TextInput>(null);
  const occupationRef = useRef<TextInput>(null);
  const educationRef = useRef<TextInput>(null);

  const toggleInterest = useCallback(
    (i: string) =>
      setInterests((prev) =>
        prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
      ),
    []
  );
  const selectGender = useCallback(
    (v: string) => setGender(v === "Male" ? "male" : "female"),
    []
  );

  const pickPhoto = async () => {
    const image = await pickAvatarImage();
    if (image) setPhoto(image);
  };

  const dobError = savedDob ? null : validateDateOfBirth(dobInput);
  const dateOfBirth = savedDob ?? (dobError ? undefined : dateOfBirthToIso(dobInput) ?? undefined);
  const age = ageFromDob(dateOfBirth);

  const valid =
    name.trim().length > 1 &&
    !!dateOfBirth &&
    !!gender &&
    !!province &&
    !!goal;

  const save = async () => {
    if (!valid || !gender || saving) return;
    const profile = {
      name: name.trim(),
      age,
      dateOfBirth,
      gender,
      location: province,
      bio: bio.trim(),
      occupation,
      education,
      relationshipGoal: goal,
      interests,
    };
    if (AUTH_DISABLED) {
      await saveProfile(profile);
      skipAuth();
      router.replace("/(tabs)/discover");
      return;
    }
    // The account was created on the previous screen, so we're logged in
    // and can save the profile and upload the photo now.
    setSaving(true);
    try {
      await saveProfile(profile);
    } catch (e) {
      setSaving(false);
      const msg = e instanceof Error ? e.message : "Couldn't save your profile. Please try again.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Profile not saved", msg);
      return;
    }
    try {
      await uploadPendingPhoto();
    } catch {
      const msg = "Your profile was saved, but your photo didn't upload. Add it again from Edit Profile.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Photo not uploaded", msg);
    } finally {
      setSaving(false);
    }
    setOnboarded(true);
    router.replace("/(tabs)/discover");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        >
          <Text style={styles.header}>Create your profile</Text>
          <Text style={styles.sub}>Tell us a little about yourself.</Text>

          <AvatarPicker uri={photo?.uri} onPick={pickPhoto} onRemove={() => setPhoto(null)} />

          <Label text="Full name" />
          <Input
            value={name}
            onChangeText={setName}
            placeholder="e.g. Sreyneang"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => dobRef.current?.focus()}
          />

          <Label text="Age" />
          {savedDob ? (
            <>
              {/* Filled in from the date of birth given at sign-up. */}
              <Input value={String(age)} editable={false} style={styles.inputLocked} />
              <Text style={styles.readonlyHint}>From your date of birth ({formatDob(savedDob)})</Text>
            </>
          ) : (
            <>
              <Input
                ref={dobRef}
                value={dobInput}
                onChangeText={(t) => setDobInput(formatDateOfBirthInput(t))}
                keyboardType="number-pad"
                maxLength={10}
                placeholder="Date of birth (DD/MM/YYYY)"
              />
              {dobInput.length === 10 && dobError ? (
                <Text style={styles.error}>{dobError}</Text>
              ) : age > 0 ? (
                <Text style={styles.readonlyHint}>You're {age}</Text>
              ) : null}
            </>
          )}

          <Label text="Gender" />
          <Chips
            options={genderLabels}
            value={gender === "male" ? "Male" : gender === "female" ? "Female" : ""}
            onSelect={selectGender}
          />

          <Label text="Province" />
          <Chips options={provinces} value={province} onSelect={setProvince} wrap />

          <Label text="Short bio" />
          <Input
            style={styles.textarea}
            value={bio}
            onChangeText={setBio}
            placeholder="Love coffee & travel..."
            maxLength={300}
            multiline
          />

          <Label text="Occupation" />
          <Input
            ref={occupationRef}
            value={occupation}
            onChangeText={setOccupation}
            placeholder="e.g. Designer"
            autoCapitalize="words"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => educationRef.current?.focus()}
          />

          <Label text="Education" />
          <Input
            ref={educationRef}
            value={education}
            onChangeText={setEducation}
            placeholder="e.g. RUPP"
            autoCapitalize="words"
            returnKeyType="done"
          />

          <Label text="Relationship intention" />
          <Chips options={relationshipGoals} value={goal} onSelect={setGoal} wrap />

          <Label text="Interests" />
          <Interests selected={interests} onToggle={toggleInterest} />

          <PrimaryButton
            label={saving ? "Saving…" : "Start Swiping"}
            onPress={save}
            disabled={!valid || saving}
            style={{ marginTop: spacing.xl }}
          />
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

// Keeps its own focus state so highlighting a field only re-renders that field.
const Input = forwardRef<TextInput, TextInputProps>(function Input(
  { style, onFocus, onBlur, ...props },
  ref
) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      style={[styles.input, focused && styles.inputFocused, style]}
      placeholderTextColor={colors.textTertiary}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      {...props}
    />
  );
});

const Interests = memo(function Interests({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (i: string) => void;
}) {
  return (
    <View style={styles.interests}>
      {interestOptions.map((i) => (
        <InterestTag
          key={i}
          label={i}
          selected={selected.includes(i)}
          onPress={() => onToggle(i)}
        />
      ))}
    </View>
  );
});

const Chips = memo(function Chips({
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
});

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
    // 16px minimum: anything smaller makes iOS Safari zoom in on focus.
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    // The focused border replaces the browser's own focus ring.
    ...Platform.select({ web: { outlineStyle: "none" } as object }),
  },
  inputFocused: { borderColor: colors.primary },
  inputLocked: { color: colors.textSecondary },
  readonlyHint: { fontSize: font.small, color: colors.textSecondary, marginTop: 4 },
  error: { fontSize: font.small, color: colors.danger, marginTop: 4 },
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
