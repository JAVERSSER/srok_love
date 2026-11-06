import { Platform } from "react-native";

// The Django backend on the VPS. Override with EXPO_PUBLIC_API_URL in a
// `.env` file (e.g. to point at a local server while developing).
export const API_ORIGIN = process.env.EXPO_PUBLIC_API_URL ?? "https://api.slanh.site";

// On web we always call our own origin and let a proxy forward /api and
// /media to the VPS: vercel.json in production, metro.config.js in dev. The
// backend's auth cookies are SameSite=Lax, so they only work first-party, and
// the HTTPS production site couldn't call a plain-HTTP server anyway.
const useProxy = Platform.OS === "web" && !process.env.EXPO_PUBLIC_API_URL;

export const API_BASE_URL = useProxy ? "" : API_ORIGIN;

export const endpoints = {
  login: "/api/accounts/auth/login/",
  refresh: "/api/accounts/auth/token/refresh/",
  logout: "/api/accounts/auth/logout/",
  register: "/api/accounts/auth/register/",
  changePassword: "/api/accounts/auth/change-password/",
  // Forgot password: POST { email } emails a reset code; POST { email, code,
  // new_password } sets the new password. See PASSWORD_RESET_AVAILABLE below.
  passwordReset: "/api/accounts/auth/password-reset/",
  passwordResetConfirm: "/api/accounts/auth/password-reset/confirm/",
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
  // Push notifications: POST { token, platform } saves this phone's Expo push
  // token; DELETE with { token } forgets it on logout. See README.
  pushDevices: "/api/notifications/devices/",
} as const;

// Django Channels sockets live on the same server as the API. Vercel can't
// proxy WebSockets, so these always go straight to the backend.
const WS_ORIGIN = API_ORIGIN.replace(/^http/, "ws");

export const sockets = {
  chat: (roomId: number) => `${WS_ORIGIN}/ws/chat/${roomId}/`,
  match: `${WS_ORIGIN}/ws/match/`,
} as const;

// Sockets authenticate with the session cookies. On slanh.site, api/proxy.js
// shares those cookies with the backend's subdomain, so sockets work. Other web
// hosts (localhost, Vercel previews) can't share them, so chat polls there.
const sharesCookiesWithBackend =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  /(^|\.)slanh\.site$/.test(window.location.hostname);

export const SOCKETS_AVAILABLE = !useProxy || sharesCookiesWithBackend;

// The Origin header native apps send on sockets; the backend refuses
// connections without an allowed one. Override with EXPO_PUBLIC_SOCKET_ORIGIN.
export const SOCKET_ORIGIN = process.env.EXPO_PUBLIC_SOCKET_ORIGIN ?? API_ORIGIN;

// The backend can't deliver reset codes by email or SMS yet, so the flow can't
// be finished in production. Set to true once delivery ships.
export const PASSWORD_RESET_AVAILABLE = false;

// Temporary switch for UI testing: skips login/sign-up and treats the app as
// logged in. Set back to false to re-enable the real auth flow.
export const AUTH_DISABLED = false;
