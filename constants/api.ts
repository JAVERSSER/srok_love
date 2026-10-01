import { Platform } from "react-native";

// The Django backend on the VPS. Override with EXPO_PUBLIC_API_URL in a
// `.env` file (e.g. to point at a local server while developing).
export const API_ORIGIN = process.env.EXPO_PUBLIC_API_URL ?? "http://139.59.249.224:8000";

// The deployed web build is served over HTTPS, and browsers block requests
// from an HTTPS page to a plain-HTTP server (mixed content). So in production
// web builds we call our own origin and let vercel.json proxy /api and
// /media to the VPS. That also makes the auth cookies first-party.
const useProxy = Platform.OS === "web" && !__DEV__ && !process.env.EXPO_PUBLIC_API_URL;

export const API_BASE_URL = useProxy ? "" : API_ORIGIN;

export const endpoints = {
  login: "/api/accounts/auth/login/",
  refresh: "/api/accounts/auth/token/refresh/",
  // Not in the shared API list. Change this if the backend uses another path.
  register: "/api/accounts/auth/register/",
  photos: "/api/accounts/media/photos/",
  assignPhotos: "/api/accounts/media/photos/assign/",
} as const;

// Temporary switch for UI testing: skips login/sign-up and treats the app as
// logged in. Set back to false to re-enable the real auth flow.
export const AUTH_DISABLED = false;
