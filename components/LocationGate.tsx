import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Linking,
  Platform,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { spacing, font, radius, shadow } from "@/constants/spacing";
import { PrimaryButton } from "@/components/ui";
import { getDeviceLocation, type Coords, type LocationResult } from "@/services/location";

// Full-screen block shown until the phone's location is on and allowed.
// SrokLove matches people by distance, so nothing works without it.
// Before the system permission prompt we show our own pop-up explaining why.
export function LocationGate({ onReady }: { onReady: (coords: Coords) => void }) {
  const [checking, setChecking] = useState(true);
  const [result, setResult] = useState<LocationResult | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);

  const check = useCallback(
    async (ask: boolean) => {
      setChecking(true);
      const r = await getDeviceLocation({ ask });
      setChecking(false);
      setResult(r);
      if (r.status === "ok") onReady(r.coords);
      else setPopupOpen(true);
    },
    [onReady],
  );

  // First look without prompting; the pop-up asks only when it's needed.
  useEffect(() => {
    check(false);
  }, [check]);

  const allow = () => {
    setPopupOpen(false);
    check(true);
  };

  const blockedForever = result?.status === "denied" && !result.canAskAgain && Platform.OS !== "web";
  const isOff = result?.status === "off";

  const popupTitle = isOff ? "Turn on location" : blockedForever ? "Location is blocked" : "Allow location?";
  const popupMessage = isOff
    ? "Location is switched off on your phone. Turn it on, then tap Try Again."
    : blockedForever
      ? "Open Settings, allow location for SrokLove, then come back."
      : result?.status === "error"
        ? result.message
        : "SrokLove uses your location to show people near you. We only share your distance, never your exact spot.";
  const popupAction = isOff ? "Try Again" : blockedForever ? "Open Settings" : "Allow";
  const onPopupAction = blockedForever
    ? () => {
        setPopupOpen(false);
        Linking.openSettings();
      }
    : allow;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="location" size={56} color={colors.primary} />
      </View>
      <Text style={styles.title}>Turn on location</Text>
      <Text style={styles.message}>SrokLove needs your location to show people near you.</Text>
      {checking ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.action} />
      ) : (
        <View style={styles.action}>
          <PrimaryButton label="Allow Location" onPress={() => setPopupOpen(true)} />
          {blockedForever && (
            <PrimaryButton label="Try Again" onPress={() => check(false)} style={styles.second} />
          )}
        </View>
      )}

      <Modal
        visible={popupOpen && !checking}
        transparent
        animationType="fade"
        onRequestClose={() => setPopupOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.popup}>
            <View style={styles.popupIcon}>
              <Ionicons name={isOff ? "navigate" : "location"} size={34} color={colors.white} />
            </View>
            <Text style={styles.popupTitle}>{popupTitle}</Text>
            <Text style={styles.popupMessage}>{popupMessage}</Text>

            <PrimaryButton label={popupAction} onPress={onPopupAction} style={styles.popupButton} />
            <Pressable
              accessibilityRole="button"
              onPress={() => setPopupOpen(false)}
              style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.cancelText}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    backgroundColor: colors.primarySoft,
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

  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  popup: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    alignItems: "center",
    ...shadow.card,
  },
  popupIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    borderWidth: 6,
    borderColor: colors.primarySoft,
  },
  popupTitle: { fontSize: font.h3, fontWeight: "800", color: colors.text, textAlign: "center" },
  popupMessage: {
    fontSize: font.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  popupButton: { alignSelf: "stretch", marginTop: spacing.xl },
  cancel: {
    alignSelf: "stretch",
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
  },
  cancelText: { fontSize: font.body, fontWeight: "700", color: colors.text },
});
