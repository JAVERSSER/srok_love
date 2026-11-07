import { Platform } from "react-native";

// The Django backend on the VPS. Override with EXPO_PUBLIC_API_URL in a
// `.env` file (e.g. to point at a local server while developing).
export const API_ORIGIN = process.env.EXPO_PUBLIC_API_URL ?? "https://api.slanh.site";

// The production site calls the backend directly: the backend allows its origin
// and api.slanh.site is same-site, so the login cookies also reach the sockets.
// Other web hosts aren't allowed or same-site, so they call their own origin and
// a proxy forwards /api and /media: vercel.json for previews, metro.config.js in dev.
const isProductionSite = Platform.OS === "web" && typeof window !== "undefined" && window.location.hostname === "www.slanh.site";
const useProxy = Platform.OS === "web" && !process.env.EXPO_PUBLIC_API_URL && !isProductionSite;

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

// Sockets authenticate with the session cookies. Behind a proxy those belong to
// the proxy's origin, so the browser won't send them to the backend's socket,
// and chat polls instead.
export const SOCKETS_AVAILABLE = !useProxy;

// The Origin header native apps send on sockets; the backend refuses
// connections without an allowed one. Override with EXPO_PUBLIC_SOCKET_ORIGIN.
export const SOCKET_ORIGIN = process.env.EXPO_PUBLIC_SOCKET_ORIGIN ?? API_ORIGIN;

// The backend can't deliver reset codes by email or SMS yet, so the flow can't
// be finished in production. Set to true once delivery ships.
export const PASSWORD_RESET_AVAILABLE = false;

// Temporary switch for UI testing: skips login/sign-up and treats the app as
// logged in. Set back to false to re-enable the real auth flow.
export const AUTH_DISABLED = false;
