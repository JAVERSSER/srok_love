import * as Location from "expo-location";

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

/** Asks for location permission if needed and reads the phone's current position. */
export async function getDeviceLocation(): Promise<LocationResult> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") return { status: "denied", canAskAgain: perm.canAskAgain };
    if (!(await Location.hasServicesEnabledAsync())) return { status: "off" };
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { status: "ok", coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Couldn't get your location." };
  }
}
