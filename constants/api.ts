import { Platform } from "react-native";

// The Django backend on the VPS. Override with EXPO_PUBLIC_API_URL in a
// `.env` file (e.g. to point at a local server while developing).
export const API_ORIGIN = process.env.EXPO_PUBLIC_API_URL ?? "http://139.59.249.224";

// On web we always call our own origin and let a proxy forward /api and
// /media to the VPS: vercel.json in production, metro.config.js in dev. The
// backend's auth cookies are SameSite=Lax, so they only work first-party, and
// the HTTPS production site couldn't call a plain-HTTP server anyway.
const useProxy = Platform.OS === "web" && !process.env.EXPO_PUBLIC_API_URL;

export const API_BASE_URL = useProxy ? "" : API_ORIGIN;

export const endpoints = {
  login: "/api/accounts/auth/login/",
  refresh: "/api/accounts/auth/token/refresh/",
  register: "/api/accounts/auth/register/",
  changePassword: "/api/accounts/auth/change-password/",
  profile: "/api/accounts/profile/",
  updateProfile: "/api/accounts/profile/update/",
  updateLocation: "/api/accounts/location/update/",
  discover: "/api/accounts/discover/",
  securitySettings: "/api/accounts/security/settings/",
  avatar: "/api/accounts/media/avatar/",
  photos: "/api/accounts/media/photos/",
  assignPhotos: "/api/accounts/media/photos/assign/",
  matched: "/api/matches/matched/",
  swipe: "/api/matches/swipe/",
  chatList: "/api/chats/list/",
  chatMessages: (roomId: number) => `/api/chats/messages/${roomId}/`,
  chatRead: (roomId: number) => `/api/chats/read/${roomId}/`,
} as const;

// Django Channels sockets live on the same server as the API. Vercel can't
// proxy WebSockets, so these always go straight to the backend.
const WS_ORIGIN = API_ORIGIN.replace(/^http/, "ws");

export const sockets = {
  chat: (roomId: number) => `${WS_ORIGIN}/ws/chat/${roomId}/`,
  match: `${WS_ORIGIN}/ws/match/`,
} as const;

// Sockets authenticate with the session cookies. Behind the web proxy those
// belong to our own origin, so the browser won't send them to the backend's
// socket (and an HTTPS page can't open ws:// at all). Until the backend is
// served from the same site with TLS, web chat is read-only and polls.
export const SOCKETS_AVAILABLE = !useProxy;

// Temporary switch for UI testing: skips login/sign-up and treats the app as
// logged in. Set back to false to re-enable the real auth flow.
export const AUTH_DISABLED = false;
