import * as Location from "expo-location";
import { Platform } from "react-native";

export interface Coords {
  latitude: number;
  longitude: number;
}

export type LocationResult =
  | { status: "ok"; coords: Coords }
  // Location permission refused. When it can't be asked again, the user has
  // to allow it in the phone's settings.
  | { status: "denied"; canAskAgain: boolean }
  // Permission granted but location (GPS) is switched off on the phone.
  | { status: "off" }
  | { status: "error"; message: string };

// A GPS fix can take a while indoors; after this we settle for the phone's
// last known position if it's recent.
const FIX_TIMEOUT_MS = 10000;
const LAST_KNOWN_MAX_AGE_MS = 2 * 60 * 1000;

function toCoords(pos: Location.LocationObject): Coords {
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
}

// A fresh high-accuracy (GPS) fix, falling back to a recent last-known
// position if the fix takes too long.
async function readPosition(): Promise<Coords> {
  const fix = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), FIX_TIMEOUT_MS));
  const pos = await Promise.race([fix, timeout]);
  if (pos) return toCoords(pos);
  const last = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS });
  return toCoords(last ?? (await fix));
}

/**
 * Reads the phone's current position. With `ask` (the default) it asks for
 * location permission if needed; without it, a missing permission is just reported.
 */
export async function getDeviceLocation({ ask = true }: { ask?: boolean } = {}): Promise<LocationResult> {
  if (Platform.OS === "web") return getWebLocation();
  try {
    const perm = ask
      ? await Location.requestForegroundPermissionsAsync()
      : await Location.getForegroundPermissionsAsync();
    if (perm.status !== "granted") return { status: "denied", canAskAgain: perm.canAskAgain };
    if (!(await Location.hasServicesEnabledAsync())) return { status: "off" };
    return { status: "ok", coords: await readPosition() };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Couldn't get your location." };
  }
}

// On web, a single navigator.geolocation call both asks for permission (only
// if the browser hasn't already granted it) and returns the position. Asking
// for permission first and then reading the position separately makes some
// browsers (Safari especially) show the prompt twice.
function getWebLocation(): Promise<LocationResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({ status: "off" });
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          status: "ok",
          coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
        }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) resolve({ status: "denied", canAskAgain: true });
        else if (err.code === err.POSITION_UNAVAILABLE) resolve({ status: "off" });
        else resolve({ status: "error", message: err.message || "Couldn't get your location." });
      },
      // Reuse a position up to 2 minutes old instead of waiting for a new GPS fix.
      { enableHighAccuracy: true, timeout: 15000, maximumAge: LAST_KNOWN_MAX_AGE_MS },
    );
  });
}

/** The current position without prompting, or null if location isn't available right now. */
export async function getCurrentCoords(): Promise<Coords | null> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== "granted" || !(await Location.hasServicesEnabledAsync())) return null;
    return await readPosition();
  } catch {
    return null;
  }
}
