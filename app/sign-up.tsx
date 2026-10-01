import React, { useState } from "react";
import {
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "@/store/appStore";
import { colors } from "@/constants/colors";
import { spacing, font } from "@/constants/spacing";
import { PrimaryButton, GhostButton, TextField } from "@/components/ui";
import {
  dateOfBirthToIso,
  formatDateOfBirthInput,
  validateDateOfBirth,
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  validateUsername,
} from "@/services/auth";

export default function SignUp() {
  const router = useRouter();
  const register = useAppStore((s) => s.register);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  // Only show errors after the user has tried to submit, so they aren't
  // shouted at while still typing.
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const usernameError = validateUsername(username);
  const emailError = validateEmail(email);
  const phoneError = validatePhoneNumber(phoneNumber);
  const dobError = validateDateOfBirth(dateOfBirth);
  const passwordError = validatePassword(password);
  const confirmError =
    confirm.length === 0
      ? "Please confirm your password."
      : confirm !== password
        ? "Passwords do not match."
        : null;
  const valid = !usernameError && !emailError && !phoneError && !dobError && !passwordError && !confirmError;

  const submit = async () => {
    setSubmitted(true);
    if (!valid || loading) return;
    setLoading(true);
    setServerError(null);
    try {
      await register({ username, email, phoneNumber, password, dateOfBirth: dateOfBirthToIso(dateOfBirth)! });
      // replace, so Back can't return to the sign-up form after registering.
      router.replace("/create-profile");
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
            Almost there! Fill in your details to create your account.
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
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            error={submitted ? emailError : null}
          />
          <TextField
            label="Phone number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="012 345 678"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            maxLength={20}
            error={submitted ? phoneError : null}
          />
          <TextField
            label="Date of birth"
            value={dateOfBirth}
            onChangeText={(t) => setDateOfBirth(formatDateOfBirthInput(t))}
            placeholder="DD/MM/YYYY"
            keyboardType="number-pad"
            autoComplete="birthdate-full"
            maxLength={10}
            error={submitted ? dobError : null}
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secure
            // "oneTimeCode" stops iOS from offering an auto-generated strong
            // password; users pick their own.
            textContentType="oneTimeCode"
            autoComplete="off"
            error={submitted ? passwordError : null}
          />
          <TextField
            label="Confirm password"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Re-enter your password"
            secure
            // "oneTimeCode" stops iOS from offering an auto-generated strong
            // password; users pick their own.
            textContentType="oneTimeCode"
            autoComplete="off"
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
