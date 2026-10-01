import React, { useState } from "react";
import {
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "@/store/appStore";
import { colors } from "@/constants/colors";
import { spacing, font } from "@/constants/spacing";
import { PrimaryButton, GhostButton, TextField } from "@/components/ui";
import { validatePassword, validateUsername } from "@/services/auth";

export default function SignUp() {
  const router = useRouter();
  const register = useAppStore((s) => s.register);
  const uploadPendingPhoto = useAppStore((s) => s.uploadPendingPhoto);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  // Only show errors after the user has tried to submit, so they aren't
  // shouted at while still typing.
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const usernameError = validateUsername(username);
  const passwordError = validatePassword(password);
  const confirmError =
    confirm.length === 0
      ? "Please confirm your password."
      : confirm !== password
        ? "Passwords do not match."
        : null;
  const valid = !usernameError && !passwordError && !confirmError;

  const submit = async () => {
    setSubmitted(true);
    if (!valid || loading) return;
    setLoading(true);
    setServerError(null);
    try {
      await register(username, password);
      try {
        await uploadPendingPhoto();
      } catch {
        const msg = "Your account was created, but your photo didn't upload. Add it again from Edit Profile.";
        if (Platform.OS === "web") window.alert(msg);
        else Alert.alert("Photo not uploaded", msg);
      }
      router.replace("/(tabs)/discover");
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Couldn't create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <GhostButton
            label="‹ Back"
            onPress={() => router.back()}
            color={colors.textSecondary}
            style={styles.back}
          />
          <Text style={styles.header}>Create your account</Text>
          <Text style={styles.sub}>
            Almost there! Pick a username and password to log in with.
          </Text>

          <TextField
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="e.g. sreyneang_99"
            textContentType="username"
            autoComplete="username"
            error={submitted ? usernameError : null}
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secure
            textContentType="newPassword"
            autoComplete="new-password"
            error={submitted ? passwordError : null}
          />
          <TextField
            label="Confirm password"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Re-enter your password"
            secure
            textContentType="newPassword"
            autoComplete="new-password"
            onSubmitEditing={submit}
            returnKeyType="done"
            error={submitted ? confirmError : null}
          />

          {serverError ? <Text style={styles.error}>{serverError}</Text> : null}

          <PrimaryButton
            label={loading ? "Creating account…" : "Create Account"}
            onPress={submit}
            disabled={loading}
            style={{ marginTop: spacing.xl }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl },
  back: { alignSelf: "flex-start", paddingVertical: spacing.sm },
  header: { fontSize: font.h2, fontWeight: "800", color: colors.text },
  sub: { fontSize: font.body, color: colors.textSecondary, marginTop: 4 },
  error: { color: colors.danger, fontSize: font.small, marginTop: spacing.md },
});
