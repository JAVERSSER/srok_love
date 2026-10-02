import React, { useEffect } from "react";
import { AppState } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GlassTabBar } from "@/components/GlassTabBar";
import { LocationGate } from "@/components/LocationGate";
import { useAppStore } from "@/store/appStore";
import { AUTH_DISABLED, sockets } from "@/constants/api";
import { openSocket } from "@/services/socket";

const SESSION_CHECK_MS = 30000;

export default function TabsLayout() {
  const matchCount = useAppStore((s) => s.matches.length);
  const loggedIn = useAppStore((s) => s.loggedIn);
  const unread = useAppStore((s) => s.conversations.reduce((n, c) => n + c.unread, 0));
  const hasLocation = useAppStore((s) => s.deviceCoords != null);
  const setDeviceCoords = useAppStore((s) => s.setDeviceCoords);

  // An account can only be logged in on one device: logging in elsewhere
  // revokes this device's session on the server. Check it regularly and
  // whenever the app comes back to the foreground, so this device is signed
  // out promptly instead of on its next action.
  useEffect(() => {
    if (!loggedIn || AUTH_DISABLED) return;
    const { checkSession } = useAppStore.getState();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") checkSession();
    }, SESSION_CHECK_MS);
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") checkSession();
    });
    return () => {
      clearInterval(timer);
      appState.remove();
    };
  }, [loggedIn]);

  // Fetch the profile, discover, matches and chats whenever the app opens
  // signed in, and listen for new matches while it's open. Waits for the
  // phone's location so discover is searched around it.
  useEffect(() => {
    if (!loggedIn || !hasLocation || AUTH_DISABLED) return;
    const { syncAll, onMatchEvent } = useAppStore.getState();
    syncAll();
    const socket = openSocket(sockets.match, () => {
      onMatchEvent().catch(() => {});
    });
    // Coming back to the app (maybe somewhere else): send the new position
    // and reload who's nearby.
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") useAppStore.getState().refreshDiscover().catch(() => {});
    });
    return () => {
      socket.close();
      appState.remove();
    };
  }, [loggedIn, hasLocation]);

  // Also catches an expired session (the API logs the user out).
  if (!loggedIn) return <Redirect href="/" />;
  if (!hasLocation) return <LocationGate onReady={setDeviceCoords} />;

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: "Swipe",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flame" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          title: "Likes",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Matches",
          tabBarBadge: matchCount > 0 ? matchCount : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
