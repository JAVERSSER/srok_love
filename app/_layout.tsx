import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { useAppStore } from "@/store/appStore";
import { colors } from "@/constants/colors";

export default function RootLayout() {
  const hydrate = useAppStore((s) => s.hydrate);
  const hydrated = useAppStore((s) => s.hydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
