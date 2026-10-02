import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Linking, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { spacing, font } from "@/constants/spacing";
import { PrimaryButton } from "@/components/ui";
import { getDeviceLocation, type Coords, type LocationResult } from "@/services/location";

// Full-screen block shown until the phone's location is on and allowed.
// SrokLove matches people by distance, so nothing works without it.
export function LocationGate({ onReady }: { onReady: (coords: Coords) => void }) {
  const [checking, setChecking] = useState(true);
  const [result, setResult] = useState<LocationResult | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    const r = await getDeviceLocation();
    setChecking(false);
    setResult(r);
    if (r.status === "ok") onReady(r.coords);
  }, [onReady]);

  useEffect(() => {
    check();
  }, [check]);

  const blockedForever = result?.status === "denied" && !result.canAskAgain && Platform.OS !== "web";

  const message =
    result?.status === "off"
      ? "Location is switched off on your phone. Turn it on, then tap Try Again."
      : result?.status === "denied"
        ? blockedForever
          ? "Location access is blocked. Open Settings, allow location for SrokLove, then come back."
          : "SrokLove needs your location to show people near you."
        : result?.status === "error"
          ? result.message
          : "SrokLove needs your location to show people near you.";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="location" size={56} color={colors.primary} />
      </View>
      <Text style={styles.title}>Turn on location</Text>
      <Text style={styles.message}>{message}</Text>
      {checking ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.action} />
      ) : (
        <View style={styles.action}>
          <PrimaryButton
            label={blockedForever ? "Open Settings" : "Try Again"}
            onPress={blockedForever ? () => Linking.openSettings() : check}
          />
          {blockedForever && <PrimaryButton label="Try Again" onPress={check} style={styles.second} />}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(231,39,94,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: { fontSize: font.h3, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  message: {
    fontSize: font.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  action: { alignSelf: "stretch", marginTop: spacing.xl },
  second: { marginTop: spacing.sm },
});
