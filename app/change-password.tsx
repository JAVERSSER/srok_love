import React, { useState } from "react";
import { Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PrimaryButton, TextField } from "@/components/ui";
import { changePassword } from "@/services/api";
import { validatePassword } from "@/services/auth";
import { colors } from "@/constants/colors";
import { spacing, font } from "@/constants/spacing";

export default function ChangePassword() {
  const router = useRouter();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = next.length > 0 && confirm.length > 0 && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    const invalid =
      validatePassword(next) ?? (next !== confirm ? "Passwords don't match." : null);
    if (invalid) {
      setError(invalid);
      return;
    }
    setLoading(true);
    try {
      await changePassword(next);
      setDone(true);
      setTimeout(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile")), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't change your password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearError = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setError(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScreenHeader title="Change Password" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TextField
            label="New password"
            value={next}
            onChangeText={clearError(setNext)}
            placeholder="At least 8 characters, letters and numbers"
            secure
            textContentType="newPassword"
            autoComplete="new-password"
          />
          <TextField
            label="Confirm new password"
            value={confirm}
            onChangeText={clearError(setConfirm)}
            placeholder="Type it again"
            secure
            textContentType="newPassword"
            autoComplete="new-password"
            onSubmitEditing={submit}
            returnKeyType="done"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {done ? <Text style={styles.success}>Password changed.</Text> : null}

          <PrimaryButton
            label={loading ? "Saving…" : "Change Password"}
            onPress={submit}
            disabled={!canSubmit || done}
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
  error: { color: colors.danger, fontSize: font.small, marginTop: spacing.md },
  success: { color: colors.primary, fontSize: font.small, marginTop: spacing.md },
});
