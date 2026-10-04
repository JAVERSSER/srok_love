import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import * as api from "@/services/api";
import { storage } from "@/services/storage";

// Push notifications sent by the backend through Expo's push service.
//
// The backend sends { title, body, data: { type, userId?, roomId? } } where
// type is "match", "message" or "like". The app shows it as a system
// notification, adds it to the Notifications screen and, when tapped, opens
// the matching chat or profile.

export type PushType = "match" | "message" | "like";

export interface PushData {
  type?: PushType;
  userId?: string | number;
  roomId?: string | number;
}

const TOKEN_KEY = "pushToken";

// Show notifications as banners even while the app is open.
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Asks for permission, gets this phone's Expo push token and sends it to the
 * backend. Returns the token, or null when push isn't possible (web, a
 * simulator, permission denied, or no EAS project id). Never throws.
 */
export async function registerForPush(): Promise<string | null> {
  try {
    if (Platform.OS === "web" || !Device.isDevice) return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "SrokLove",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#E7275E",
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== "granted") return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn("Push notifications need an EAS project id. Run `npx eas init` once.");
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.registerPushToken(token);
    await storage.set(TOKEN_KEY, token);
    return token;
  } catch (e) {
    console.warn("Couldn't register for push notifications", e);
    return null;
  }
}

/** Tells the backend to stop pushing to this phone. Never throws. */
export async function unregisterPush(): Promise<void> {
  try {
    const token = await storage.get<string>(TOKEN_KEY);
    if (!token) return;
    await storage.remove(TOKEN_KEY);
    await api.unregisterPushToken(token);
  } catch {
    // The session may already be gone; the backend drops dead tokens itself.
  }
}

/**
 * Listens for pushes: `onReceive` for each one that arrives (also while the
 * app is open), `onOpen` when the user taps one. Returns an unsubscribe.
 */
export function listenForPush(
  onReceive: (n: { id: string; title: string; body: string; data: PushData }) => void,
  onOpen: (data: PushData) => void
): () => void {
  if (Platform.OS === "web") return () => {};

  const toPayload = (n: Notifications.Notification) => ({
    id: n.request.identifier,
    title: n.request.content.title ?? "",
    body: n.request.content.body ?? "",
    data: (n.request.content.data ?? {}) as PushData,
  });

  const received = Notifications.addNotificationReceivedListener((n) => onReceive(toPayload(n)));
  const tapped = Notifications.addNotificationResponseReceivedListener((r) => {
    const payload = toPayload(r.notification);
    onReceive(payload);
    onOpen(payload.data);
  });

  // A tap that launched the app from closed. Cleared so it only opens once.
  const launched = Notifications.getLastNotificationResponse();
  if (launched) {
    Notifications.clearLastNotificationResponse();
    const payload = toPayload(launched.notification);
    onReceive(payload);
    onOpen(payload.data);
  }

  return () => {
    received.remove();
    tapped.remove();
  };
}
