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
    //
    // When the on-screen keyboard opens, mobile browsers shrink only the
    // *visual* viewport and pan the page around, pushing the header off
    // screen. Pinning #root to the visual viewport keeps inputs sitting right
    // above the keyboard, like a native chat app.
    //
    // iOS Safari zooms into any focused input with font-size < 16px and never
    // zooms back out, so touch devices get 16px inputs.
    const style = document.createElement("style");
    style.textContent = `
      html, body { height: 100dvh; overflow: hidden; }
      #root {
        position: fixed; left: 0; right: 0;
        top: var(--vv-top, 0px);
        height: var(--vv-height, 100dvh);
      }
      @media (pointer: coarse) {
        input, textarea { font-size: 16px !important; }
      }
    `;
    document.head.appendChild(style);

    // Belt and braces for the zoom: `maximum-scale=1` stops iOS from
    // auto-zooming focused inputs (iOS still allows pinch-zoom regardless).
    const viewport =
      document.querySelector<HTMLMetaElement>('meta[name="viewport"]') ??
      document.head.appendChild(Object.assign(document.createElement("meta"), { name: "viewport" }));
    const prevViewport = viewport.content;
    viewport.content = "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover";

    const vv = window.visualViewport;
    const root = document.documentElement;
    // These events fire many times per frame while the keyboard animates;
    // batch to one write per frame and skip no-op writes to avoid relayouts.
    let frame = 0;
    let last = "";
    const apply = () => {
      frame = 0;
      if (!vv) return;
      const next = `${vv.height}|${vv.offsetTop}`;
      if (next === last) return;
      last = next;
      root.style.setProperty("--vv-height", `${vv.height}px`);
      root.style.setProperty("--vv-top", `${vv.offsetTop}px`);
    };
    const sync = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    apply();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      cancelAnimationFrame(frame);
      root.style.removeProperty("--vv-height");
      root.style.removeProperty("--vv-top");
      viewport.content = prevViewport;
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
              <Stack.Screen name="sign-up" />
              <Stack.Screen name="login" />
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
