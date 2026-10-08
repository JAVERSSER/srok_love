import React, { useState } from "react";
import { Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PrimaryButton, GhostButton, TextField } from "@/components/ui";
import { requestPasswordReset, confirmPasswordReset } from "@/services/api";
import { validateEmail, validatePassword } from "@/services/auth";
import { colors } from "@/constants/colors";
import { spacing, font } from "@/constants/spacing";

// Two steps: enter the account email to get a reset code, then enter the code
// with a new password.
export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSend = email.trim().length > 0 && !loading;
  const canReset = code.trim().length > 0 && next.length > 0 && confirm.length > 0 && !loading;

  const sendCode = async () => {
    if (!canSend) return;
    const invalid = validateEmail(email);
    if (invalid) {
      setError(invalid);
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setStep("reset");
      setInfo(`We sent a reset code to ${email.trim()}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    if (!canReset) return;
    const invalid =
      validatePassword(next) ?? (next !== confirm ? "Passwords don't match." : null);
    if (invalid) {
      setError(invalid);
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(email, code, next);
      setDone(true);
      setTimeout(() => router.replace("/login"), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reset your password. Please try again.");
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
      <ScreenHeader title="Reset Password" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {step === "email" ? (
            <>
              <Text style={styles.sub}>
                Enter the email on your account and we'll send you a code to reset your password.
              </Text>
              <TextField
                label="Email"
                value={email}
                onChangeText={clearError(setEmail)}
                placeholder="you@example.com"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                onSubmitEditing={sendCode}
                returnKeyType="send"
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <PrimaryButton
                label={loading ? "Sending…" : "Send Reset Code"}
                onPress={sendCode}
                disabled={!canSend}
                style={{ marginTop: spacing.xl }}
              />
            </>
          ) : (
            <>
              {info ? <Text style={styles.sub}>{info}</Text> : null}
              <TextField
                label="Reset code"
                value={code}
                onChangeText={clearError(setCode)}
                placeholder="Code from the email"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
              />
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
                onSubmitEditing={reset}
                returnKeyType="done"
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}
              {done ? <Text style={styles.success}>Password reset. You can log in now.</Text> : null}

              <PrimaryButton
                label={loading ? "Resetting…" : "Reset Password"}
                onPress={reset}
                disabled={!canReset || done}
                style={{ marginTop: spacing.xl }}
              />
              <GhostButton
                label="Didn't get it? Send again"
                onPress={sendCode}
                style={styles.resend}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl },
  sub: { fontSize: font.body, color: colors.textSecondary, marginBottom: spacing.lg },
  error: { color: colors.danger, fontSize: font.small, marginTop: spacing.md },
  success: { color: colors.primary, fontSize: font.small, marginTop: spacing.md },
  resend: { alignSelf: "center", marginTop: spacing.md },
});
