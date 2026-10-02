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
import { ScreenHeader } from "@/components/ScreenHeader";
import { InterestTag } from "@/components/InterestTag";
import { AvatarPicker, pickAvatarImage } from "@/components/AvatarPicker";
import { PrimaryButton } from "@/components/ui";
import { normalizeTelegram, normalizeFacebook } from "@/models";
import { colors } from "@/constants/colors";
import { spacing, font, radius } from "@/constants/spacing";
import { provinces, interestOptions, relationshipGoals } from "@/constants/provinces";

export default function EditProfile() {
  const router = useRouter();
  const user = useAppStore((s) => s.currentUser);
  const saveProfile = useAppStore((s) => s.saveProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [province, setProvince] = useState(user.location);
  const [occupation, setOccupation] = useState(user.occupation ?? "");
  const [education, setEducation] = useState(user.education ?? "");
  const [goal, setGoal] = useState(user.relationshipGoal ?? relationshipGoals[0]);
  const [interests, setInterests] = useState<string[]>(user.interests);
  const [telegram, setTelegram] = useState(user.telegram ?? "");
  const [facebook, setFacebook] = useState(user.facebook ?? "");

  const toggle = (i: string) =>
    setInterests((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveProfile({
      name: name.trim() || user.name,
      bio: bio.trim(),
      location: province,
      occupation,
      education,
      relationshipGoal: goal,
      interests,
      telegram: normalizeTelegram(telegram) || undefined,
      facebook: normalizeFacebook(facebook) || undefined,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Edit Profile" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <PhotoManager />

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

        <Label text="Telegram (optional)" />
        <TextInput
          style={styles.input}
          value={telegram}
          onChangeText={setTelegram}
          placeholder="@username"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Label text="Facebook (optional)" />
        <TextInput
          style={styles.input}
          value={facebook}
          onChangeText={setFacebook}
          placeholder="facebook.com/username"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.note}>Only people you match with can see these.</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          label={saving ? "Saving…" : "Save Changes"}
          onPress={save}
          disabled={saving}
          style={{ marginTop: spacing.xl }}
        />
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function PhotoManager() {
  const avatar = useAppStore((s) => s.currentUser.avatar);
  const setProfilePhoto = useAppStore((s) => s.setProfilePhoto);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const pick = async () => {
    const image = await pickAvatarImage();
    if (image) run(() => setProfilePhoto(image));
  };

  // No remove action: the backend can replace the avatar but not delete it.
  return <AvatarPicker uri={avatar} onPick={pick} busy={busy} error={error} />;
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
    // 16px minimum: anything smaller makes iOS Safari zoom in on focus.
    fontSize: 16,
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
  note: { fontSize: font.small, color: colors.textTertiary, marginTop: spacing.sm },
  error: { color: colors.danger, fontSize: font.small, marginTop: spacing.lg },
});
