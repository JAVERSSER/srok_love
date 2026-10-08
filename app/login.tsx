import React, { useState } from "react";
import {
  View,
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

export default function Login() {
  const router = useRouter();
  const login = useAppStore((s) => s.login);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = username.trim().length > 0 && password.length > 0 && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await login(username, password);
      router.replace("/(tabs)/discover");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't log in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearError = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setError(null);
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
          <Text style={styles.header}>Welcome back 👋</Text>
          <Text style={styles.sub}>Log in to keep swiping.</Text>

          <TextField
            label="Username or email"
            value={username}
            onChangeText={clearError(setUsername)}
            placeholder="Your username or email"
            textContentType="username"
            autoComplete="username"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={clearError(setPassword)}
            placeholder="Your password"
            secure
            textContentType="password"
            autoComplete="password"
            onSubmitEditing={submit}
            returnKeyType="go"
          />

          <GhostButton
            label="Forgot password?"
            onPress={() => router.push("/forgot-password")}
            style={styles.forgot}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label={loading ? "Logging in…" : "Log In"}
            onPress={submit}
            disabled={!canSubmit}
            style={{ marginTop: spacing.xl }}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <GhostButton label="Get Started" onPress={() => router.replace("/")} />
          </View>
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
  forgot: { alignSelf: "flex-end", paddingVertical: spacing.xs },
  error: { color: colors.danger, fontSize: font.small, marginTop: spacing.md },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: spacing.lg,
  },
  footerText: { color: colors.textSecondary, fontSize: font.body },
});
