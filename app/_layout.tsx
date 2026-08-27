import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { useAppStore } from "@/store/appStore";
import { colors } from "@/constants/colors";
import { layout } from "@/constants/spacing";

export default function RootLayout() {
  const hydrate = useAppStore((s) => s.hydrate);
  const hydrated = useAppStore((s) => s.hydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    // Mobile Safari's collapsible toolbar isn't accounted for by the
    // `height: 100%` Expo's web template sets on html/body/#root, so
    // fixed-position content anchored to the bottom (our tab bar) can end up
    // rendered underneath Safari's own UI. `100dvh` tracks the actual
    // visible viewport instead. Injected at runtime since expo-router's
    // `+html.tsx` override only applies to static web output, not this
    // project's SPA output mode.
    const style = document.createElement("style");
    style.textContent = `html, body, #root { height: 100dvh; }`;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <View style={styles.shell}>
          <View style={styles.content}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="create-profile" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="profile/[id]" options={{ presentation: "card" }} />
              <Stack.Screen name="chat/[id]" />
              <Stack.Screen name="edit-profile" options={{ presentation: "modal" }} />
              <Stack.Screen name="preferences" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="privacy" />
              <Stack.Screen name="safety" />
            </Stack>
          </View>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  // On phones this is a no-op (screens are already narrower than maxWidth).
  // On tablet/web it keeps the app a centered phone-width column instead of
  // stretching every screen edge to edge.
  shell: { flex: 1, backgroundColor: colors.background, alignItems: "center" },
  content: { flex: 1, width: "100%", maxWidth: layout.maxWidth },
});
