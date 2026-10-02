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
      /* Roughly the mobile keyboard's own timing, so content moves with it. */
      .kb-animate #root { transition: height 300ms cubic-bezier(0.2, 0.8, 0.2, 1); }
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

    let lastHeight = -1;
    let lastTop = -1;
    const setHeight = (h: number) => {
      if (h === lastHeight) return;
      lastHeight = h;
      root.style.setProperty("--vv-height", `${h}px`);
    };
    const setTop = (t: number) => {
      if (t === lastTop) return;
      lastTop = t;
      root.style.setProperty("--vv-top", `${t}px`);
    };

    // iOS only reports the keyboard's size once it has finished opening, so
    // following visualViewport alone makes the app snap into place late. We
    // remember the keyboard height and, on focus/blur, animate to the
    // predicted size in step with the keyboard; the real resize event then
    // just confirms it. Remembered across reloads so even the first open of
    // a session is smooth.
    //
    // Android Chrome is the opposite: it fires resize on nearly every frame
    // of the keyboard animation, and relaying out the whole app each time
    // stutters. There we use the same prediction and only apply the real
    // size once the keyboard has settled.
    const isIOS =
      /iP(hone|ad|od)/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isTouch = isIOS || !!window.matchMedia?.("(pointer: coarse)").matches;
    const SETTLE_MS = 120;
    const KB_KEY = "sroklove:keyboardHeight";
    let keyboardHeight = 0;
    try {
      keyboardHeight = Number(localStorage.getItem(KB_KEY)) || 0;
    } catch {}
    if (isTouch) root.classList.add("kb-animate");

    const isTextField = (el: Element | null) =>
      el instanceof HTMLTextAreaElement ||
      (el instanceof HTMLInputElement &&
        !["checkbox", "radio", "button", "submit", "range", "file"].includes(el.type));

    // iOS: batch visualViewport events to one write per frame.
    // Other touch devices: wait for the keyboard animation to settle.
    let frame = 0;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const applyResize = () => {
      frame = 0;
      if (!vv) return;
      const kb = window.innerHeight - vv.height;
      if (kb > 120 && Math.abs(kb - keyboardHeight) > 1) {
        keyboardHeight = kb;
        try {
          localStorage.setItem(KB_KEY, String(kb));
        } catch {}
      }
      setHeight(vv.height);
      setTop(vv.offsetTop);
    };
    const onResize = () => {
      if (isIOS || !isTouch) {
        if (!frame) frame = requestAnimationFrame(applyResize);
      } else {
        clearTimeout(settle);
        settle = setTimeout(applyResize, SETTLE_MS);
      }
    };
    // Panning doesn't change the visible height; only follow the offset, so
    // it can't undo a predicted height mid-animation.
    const onScroll = () => vv && setTop(vv.offsetTop);

    const onFocusIn = (e: FocusEvent) => {
      if (isTouch && keyboardHeight && isTextField(e.target as Element)) {
        setHeight(window.innerHeight - keyboardHeight);
      }
    };
    const onFocusOut = () => {
      if (!isTouch) return;
      // Focus may be moving straight to another field; only collapse if not.
      setTimeout(() => {
        if (!isTextField(document.activeElement)) {
          setHeight(window.innerHeight);
          setTop(0);
        }
      }, 0);
    };

    applyResize();
    vv?.addEventListener("resize", onResize);
    vv?.addEventListener("scroll", onScroll);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      vv?.removeEventListener("resize", onResize);
      vv?.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      root.classList.remove("kb-animate");
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
              <Stack.Screen name="my-photos" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="preferences" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="privacy" />
              <Stack.Screen name="change-password" />
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
