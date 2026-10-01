import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
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
        <Label text="Photos" />
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

        <PrimaryButton label="Save Changes" onPress={save} style={{ marginTop: spacing.xl }} />
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const MAX_PHOTOS = 6;

function PhotoManager() {
  const photos = useAppStore((s) => s.myPhotos);
  const addPhoto = useAppStore((s) => s.addPhoto);
  const removePhoto = useAppStore((s) => s.removePhoto);
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    run(() => addPhoto({ uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName }));
  };

  return (
    <View>
      <View style={styles.photos}>
        {photos.map((p) => (
          <View key={p.id} style={styles.photoTile}>
            <Image source={{ uri: p.url }} style={styles.photoImg} contentFit="cover" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
              onPress={() => run(() => removePhoto(p.id))}
              disabled={busy}
              hitSlop={6}
              style={styles.photoRemove}
            >
              <Ionicons name="close" size={14} color={colors.white} />
            </Pressable>
          </View>
        ))}
        {photos.length < MAX_PHOTOS ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add photo"
            onPress={pick}
            disabled={busy}
            style={[styles.photoTile, styles.photoAdd]}
          >
            {busy ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Ionicons name="add" size={28} color={colors.primary} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.photoError}>{error}</Text> : null}
    </View>
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
  photos: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  photoTile: {
    width: 96,
    height: 128,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
  },
  photoImg: { width: "100%", height: "100%" },
  photoRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoAdd: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.primary,
  },
  photoError: { color: colors.danger, fontSize: font.small, marginTop: spacing.sm },
});
