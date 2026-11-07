import { Platform } from "react-native";
import { API_BASE_URL, API_ORIGIN, endpoints } from "@/constants/api";
import type { Conversation, Gender, Match, Message, UserProfile } from "@/models";

// HTTP client for the Django backend.
//
// Auth lives in the HttpOnly `access_token` / `refresh_token` cookies the backend
// sets on login. JavaScript can't read them, so every request just has to send
// cookies (`credentials: "include"`).

const TIMEOUT_MS = 20000;

/** The server refuses bigger requests with 413. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** The backend's access cookie lasts 15 minutes; renew a minute early. */
const ACCESS_COOKIE_REFRESH_MS = 14 * 60 * 1000;

/** When the access cookie was last issued. 0: unknown, e.g. after a reload. */
let accessCookieIssuedAt = 0;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
    /** Seconds to wait, from the Retry-After header of a 429. */
    public retryAfter?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let refreshing: Promise<RefreshResult> | null = null;
let loggingOut: Promise<unknown> = Promise.resolve();
let onSessionExpired: (() => void) | null = null;

/** Called when the server has ended this session and the user must log in again. */
export function setOnSessionExpired(fn: () => void) {
  onSessionExpired = fn;
}

/** Sends the user to login, e.g. when a socket closes with code 4001. */
export function expireSession() {
  onSessionExpired?.();
}

// --- response helpers -------------------------------------------------------

type Json = Record<string, any>;

function formatWait(seconds: number): string {
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  if (seconds < 60) return plural(Math.ceil(seconds), "second");
  if (seconds < 3600) return plural(Math.ceil(seconds / 60), "minute");
  return plural(Math.ceil(seconds / 3600), "hour");
}

// The framework's stock detail is replaced with a friendlier wait message; any
// other detail (e.g. the swipe limit's) is meant for the user as it is.
function rateLimitMessage(data: unknown, retryAfter?: number): string {
  const detail = data && typeof data === "object" ? (data as Json).detail : undefined;
  if (typeof detail === "string" && detail && !detail.startsWith("Request was throttled")) return detail;
  return retryAfter
    ? `Too many attempts. Please try again in ${formatWait(retryAfter)}.`
    : "Too many attempts. Please wait a moment and try again.";
}

// Turns the backend's error bodies ({ detail }, { message }, { error },
// { non_field_errors: [] }, { field: ["msg"] }) into one readable sentence.
function errorMessage(data: unknown, status: number, retryAfter?: number): string {
  if (status === 429) return rateLimitMessage(data, retryAfter);
  if (status === 413) return "That file is too large. Uploads must be 10 MB or smaller.";
  if (typeof data === "string" && data.trim() && !data.trim().startsWith("<")) return data;
  if (data && typeof data === "object") {
    const d = data as Json;
    for (const key of ["detail", "message", "error"]) {
      if (typeof d[key] === "string") return d[key];
    }
    const parts: string[] = [];
    for (const [key, value] of Object.entries(d)) {
      const msg = Array.isArray(value) ? value.join(" ") : typeof value === "string" ? value : null;
      if (!msg) continue;
      parts.push(key === "non_field_errors" ? msg : `${key}: ${msg}`);
    }
    if (parts.length) return parts.join("\n");
  }
  if (status >= 500) return "The server had a problem. Please try again later.";
  return `Request failed (${status}).`;
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// --- core request -----------------------------------------------------------

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  form?: FormData;
  auth?: boolean;
}

async function send(path: string, opts: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  // For FormData, fetch sets the multipart boundary itself.
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(API_BASE_URL + path, {
      method: opts.method ?? (opts.body !== undefined || opts.form ? "POST" : "GET"),
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      credentials: "include",
      signal: controller.signal,
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your internet connection and try again.", 0);
  } finally {
    clearTimeout(timer);
  }
}

export async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const authed = opts.auth !== false;
  // Refresh tokens rotate, so nothing authenticated goes out mid-refresh.
  if (authed && refreshing) await refreshing;
  let res = await send(path, opts);

  if (res.status === 401 && authed) {
    const result = await refreshSession();
    if (result === "refreshed") {
      res = await send(path, opts);
      if (res.status === 401) expireSession();
    } else if (result === "rejected") {
      expireSession();
    }
    // "unavailable": offline or rate limited, which says nothing about the
    // session, so the user stays logged in and just sees this request fail.
  }

  const data = await parseBody(res);
  if (!res.ok) {
    const seconds = Number(res.headers.get("Retry-After"));
    const retryAfter = Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
    throw new ApiError(errorMessage(data, res.status, retryAfter), res.status, data, retryAfter);
  }
  return data as T;
}

type RefreshResult = "refreshed" | "rejected" | "unavailable";

/** Gets new session cookies. Concurrent callers share one request. */
function refreshSession(): Promise<RefreshResult> {
  if (!refreshing) {
    refreshing = (async (): Promise<RefreshResult> => {
      try {
        const res = await send(endpoints.refresh, { method: "POST", auth: false });
        if (res.ok) {
          accessCookieIssuedAt = Date.now();
          return "refreshed";
        }
        return res.status >= 500 || res.status === 429 ? "unavailable" : "rejected";
      } catch {
        return "unavailable";
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

/**
 * Sockets can't refresh a cookie themselves, so call this before connecting.
 * Renews the access cookie if it may have expired. Returns false, after logging
 * out, only if the server rejects the session. Never throws.
 */
export async function ensureFreshSession(): Promise<boolean> {
  if (Date.now() - accessCookieIssuedAt < ACCESS_COOKIE_REFRESH_MS) return true;
  const result = await refreshSession();
  if (result === "rejected") {
    expireSession();
    return false;
  }
  return true;
}

// --- auth -------------------------------------------------------------------

export interface AuthUser {
  id: string | null;
  username: string;
}

const deviceName = `SrokLove ${Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "Android" : "Web"}`;

/** `loginId` may be a username, email or phone number. */
export async function login(loginId: string, password: string): Promise<AuthUser> {
  // A logout still in flight would clear the cookies this login is about to set.
  await loggingOut;
  const data = await request<Json>(endpoints.login, {
    body: { login: loginId.trim(), password, device_name: deviceName },
    auth: false,
  });
  accessCookieIssuedAt = Date.now();
  const user: Json = data?.user ?? {};
  return {
    id: user.id != null ? String(user.id) : null,
    username: user.username ?? loginId.trim(),
  };
}

/**
 * Ends the session on the server, which also clears the cookies. Only for a
 * logout the user asked for: if the server already ended this session, another
 * device may hold the account's current one. `prepare` runs first, while the
 * session is still valid. Never throws.
 */
export function logout(prepare: () => Promise<void>): void {
  loggingOut = prepare()
    .catch(() => {})
    .then(() => send(endpoints.logout, { method: "POST", auth: false }))
    .catch(() => {});
}

export interface RegisterInput {
  username: string;
  email: string;
  phoneNumber: string;
  password: string;
  /** YYYY-MM-DD */
  dateOfBirth: string;
}

export async function register({ username, email, phoneNumber, password, dateOfBirth }: RegisterInput): Promise<AuthUser> {
  await request(endpoints.register, {
    body: {
      username: username.trim(),
      email: email.trim(),
      // Change the key if the backend names this field differently.
      phone_number: phoneNumber.replace(/[\s-]/g, ""),
      password,
      date_of_birth: dateOfBirth.trim(),
    },
    auth: false,
  });
  // Log in right away so we get a session whether or not register returns one.
  return login(username, password);
}

/** Sets a new password for the logged-in user; the old one isn't needed, so it works if they forgot it. */
export async function changePassword(newPassword: string): Promise<void> {
  // Change the key if the backend names this field differently.
  await request(endpoints.changePassword, { method: "POST", body: { new_password: newPassword } });
}

/** Asks the backend to email a password reset code to this address. */
export async function requestPasswordReset(email: string): Promise<void> {
  await request(endpoints.passwordReset, { body: { email: email.trim() }, auth: false });
}

/** Sets a new password using the code from the reset email. */
export async function confirmPasswordReset(email: string, code: string, newPassword: string): Promise<void> {
  await request(endpoints.passwordResetConfirm, {
    body: { email: email.trim(), code: code.trim(), new_password: newPassword },
    auth: false,
  });
}

/**
 * Makes a cheap authenticated call so a revoked session is noticed even when
 * the user isn't doing anything. A 401 the refresh can't fix triggers
 * onSessionExpired via request(); other failures (offline etc.) are ignored.
 */
export async function checkSession(): Promise<void> {
  try {
    await request(endpoints.securitySettings);
  } catch {
    // Only a rejected session matters here, and request() already handled it.
  }
}

// --- shared helpers ---------------------------------------------------------

/** Makes media URLs from the API loadable by the app (absolute, HTTPS, and proxied on web). */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith(API_ORIGIN)) return API_BASE_URL + url.slice(API_ORIGIN.length);
  if (url.startsWith("/")) return API_BASE_URL + url;
  // Cloudinary returns http:// links, which HTTPS pages would block.
  if (url.startsWith("http://res.cloudinary.com/")) return "https://" + url.slice("http://".length);
  return url;
}

/** Normalizes Django timestamps ("2026-10-01 15:47:50.396578+00:00") to ISO strings. */
export function toIso(value: unknown): string {
  if (typeof value !== "string" || !value) return new Date().toISOString();
  const d = new Date(value.replace(" ", "T").replace(/(\.\d{3})\d+/, "$1"));
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/** Age in whole years from a YYYY-MM-DD date of birth, or 0 if unknown. */
export function ageFromDob(dob: unknown): number {
  const m = typeof dob === "string" ? /^(\d{4})-(\d{2})-(\d{2})/.exec(dob) : null;
  if (!m) return 0;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const now = new Date();
  return now.getFullYear() - y - (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d) ? 1 : 0);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "14 May 2002" from a YYYY-MM-DD date of birth, or "" if unknown. */
export function formatDob(dob: unknown): string {
  const m = typeof dob === "string" ? /^(\d{4})-(\d{2})-(\d{2})/.exec(dob) : null;
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : "";
}

function toGender(value: unknown): Gender | undefined {
  return value === "male" || value === "female" ? value : undefined;
}

// --- my profile -------------------------------------------------------------

export interface MyProfile {
  username: string;
  name: string;
  gender?: Gender;
  age: number;
  /** YYYY-MM-DD */
  dateOfBirth?: string;
  interests: string[];
  avatarUrl: string;
  photos: RemotePhoto[];
  telegram?: string;
  facebook?: string;
  bio?: string;
  // Only filled in when the server sends it.
  location?: string;
}

const text = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v : undefined);

export async function getProfile(): Promise<MyProfile> {
  const d = await request<Json>(endpoints.profile);
  return {
    username: d.username ?? "",
    name: d.name ?? "",
    gender: toGender(d.gender),
    age: ageFromDob(d.date_of_birth),
    dateOfBirth: typeof d.date_of_birth === "string" ? d.date_of_birth.slice(0, 10) : undefined,
    interests: Array.isArray(d.interests) ? d.interests : [],
    avatarUrl: resolveMediaUrl(d.avatar_url),
    photos: Array.isArray(d.photos) ? d.photos.map(toPhoto) : [],
    telegram: d.telegram || undefined,
    facebook: d.facebook || undefined,
    // An empty bio is a real value: it's how a cleared bio reaches other devices.
    bio: typeof d.bio === "string" ? d.bio : undefined,
    location: text(d.province) ?? text(d.location),
  };
}

export interface ProfileUpdate {
  name?: string;
  bio?: string;
  gender?: Gender;
  interests?: string[];
  telegram?: string;
  facebook?: string;
}

export async function updateProfile(patch: ProfileUpdate): Promise<void> {
  await request(endpoints.updateProfile, { method: "POST", body: patch });
}

/** Tells the backend where to send push notifications for this account. */
export async function registerPushToken(token: string): Promise<void> {
  await request(endpoints.pushDevices, { method: "POST", body: { token, platform: Platform.OS } });
}

/** Stops push notifications to this phone (on logout). */
export async function unregisterPushToken(token: string): Promise<void> {
  await request(endpoints.pushDevices, { method: "DELETE", body: { token } });
}

export async function updateLocation(latitude: number, longitude: number): Promise<void> {
  await request(endpoints.updateLocation, { method: "POST", body: { latitude, longitude } });
}

export interface SecuritySettings {
  singleDevicePolicy: boolean;
  policyMessage: string;
  currentDevice: { deviceName: string; ipAddress: string; lastActive: string } | null;
  lastLogin: { deviceName: string; ipAddress: string; time: string } | null;
}

export async function getSecuritySettings(): Promise<SecuritySettings> {
  const d = await request<Json>(endpoints.securitySettings);
  const cur = d.current_device;
  const last = d.last_login;
  return {
    singleDevicePolicy: !!d.single_device_policy,
    policyMessage: d.policy_message ?? "",
    currentDevice: cur
      ? { deviceName: cur.device_name ?? "", ipAddress: cur.ip_address ?? "", lastActive: toIso(cur.last_active) }
      : null,
    lastLogin: last
      ? { deviceName: last.device_name ?? "", ipAddress: last.ip_address ?? "", time: toIso(last.time) }
      : null,
  };
}

// --- media ------------------------------------------------------------------

export interface RemotePhoto {
  id: number;
  url: string;
  order?: number;
}

// Upload responses use { photo_id, image }; the profile's photo list uses
// { id, image_url, order }.
function toPhoto(data: Json): RemotePhoto {
  const raw = data.image_url ?? data.image ?? data.url ?? "";
  return { id: Number(data.photo_id ?? data.id), url: resolveMediaUrl(String(raw)), order: data.order };
}

/** Profile photos in display order. */
export function sortPhotos(photos: RemotePhoto[]): RemotePhoto[] {
  return [...photos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export interface LocalImage {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}

async function imageForm(field: string, image: LocalImage): Promise<FormData> {
  const type = image.mimeType ?? "image/jpeg";
  const name = image.fileName ?? `photo.${type.split("/")[1] ?? "jpg"}`;
  // Check the size here so the user isn't left waiting for the server's 413.
  // On web the picker gives a blob:/data: URI and FormData needs the Blob itself.
  const blob = await fetch(image.uri).then((r) => r.blob()).catch(() => null);
  if (blob && blob.size > MAX_UPLOAD_BYTES) {
    throw new ApiError("That photo is too large. Photos must be 10 MB or smaller.", 413);
  }
  const form = new FormData();
  if (Platform.OS === "web") {
    if (!blob) throw new ApiError("Couldn't read that photo. Please pick it again.", 0);
    form.append(field, blob, name);
  } else {
    form.append(field, { uri: image.uri, name, type } as unknown as Blob);
  }
  return form;
}

/** Sets the avatar other people see in Discover, Matches and Chats. Returns its URL. */
export async function uploadAvatar(image: LocalImage): Promise<string> {
  const data = await request<Json>(endpoints.avatar, { form: await imageForm("avatar", image), method: "POST" });
  return resolveMediaUrl(data?.avatar_url);
}

export async function uploadPhoto(image: LocalImage): Promise<RemotePhoto> {
  const data = await request<Json>(endpoints.photos, { form: await imageForm("image", image), method: "POST" });
  return toPhoto(data);
}

/**
 * Sets the profile's photos; list order is display order. The server
 * PERMANENTLY DELETES any photo left out, so build `photoIds` from a fresh copy
 * of the server's list.
 */
export async function assignPhotos(photoIds: number[]): Promise<void> {
  await request(endpoints.assignPhotos, { body: { photos: photoIds.map((id) => ({ id })) } });
}

// --- discover & matches -----------------------------------------------------

/** Turns any user-shaped object from the API (discover, matches, chats) into a UserProfile. */
export function toUserProfile(d: Json): UserProfile {
  const avatar = resolveMediaUrl(d.avatar_url ?? d.avatar);
  // The gallery, when the endpoint sends it; the avatar is kept separately.
  const photos = Array.isArray(d.photos) ? sortPhotos(d.photos.map(toPhoto)).map((p) => p.url).filter(Boolean) : [];
  const distance = d.distance_km != null ? Number(d.distance_km) : NaN;
  return {
    id: String(d.user_id ?? d.id),
    username: d.username ?? undefined,
    name: d.name || d.username || "",
    age: d.age != null ? Number(d.age) : ageFromDob(d.date_of_birth),
    gender: toGender(d.gender),
    location: d.city ?? "",
    bio: d.bio ?? "",
    avatar: avatar || undefined,
    photos,
    interests: Array.isArray(d.interests) ? d.interests : [],
    telegram: d.telegram || undefined,
    facebook: d.facebook || undefined,
    distanceKm: isNaN(distance) ? undefined : distance,
  };
}

/** People near the user's last reported location. */
export async function discover(): Promise<UserProfile[]> {
  const data = await request<Json[] | Json>(endpoints.discover);
  return Array.isArray(data) ? data.map(toUserProfile) : [];
}

export type SwipeAction = "like" | "pass";

export async function swipe(userId: string, action: SwipeAction): Promise<void> {
  await request(endpoints.swipe, { body: { user_id: Number(userId), action } });
}

export interface MatchedEntry {
  match: Match;
  user: UserProfile;
}

export async function getMatches(): Promise<MatchedEntry[]> {
  const data = await request<Json[]>(endpoints.matched);
  if (!Array.isArray(data)) return [];
  return data.map((d) => ({
    match: {
      id: String(d.match_id ?? d.id),
      userId: "me",
      matchedUserId: String(d.user_id),
      roomId: d.room_id != null ? Number(d.room_id) : undefined,
      compatibility: d.compatibility_score != null ? Number(d.compatibility_score) : undefined,
      createdAt: toIso(d.created_at),
    },
    user: toUserProfile(d),
  }));
}

/**
 * Reads a /ws/match/ frame:
 * { type: "match", data: { match_id, room_id, user: { id, username, avatar } } }.
 * Returns null for anything else.
 */
export function parseMatchEvent(frame: Record<string, unknown>): MatchedEntry | null {
  if (frame.type !== "match") return null;
  const d = frame.data as Json | null | undefined;
  if (d?.match_id == null || d.user?.id == null) return null;
  const user = toUserProfile(d.user);
  return {
    match: {
      id: String(d.match_id),
      userId: "me",
      matchedUserId: user.id,
      roomId: d.room_id != null ? Number(d.room_id) : undefined,
      createdAt: new Date().toISOString(),
    },
    user,
  };
}

// --- chats ------------------------------------------------------------------

export interface ChatEntry {
  conversation: Conversation;
  user: UserProfile;
}

export async function getChats(): Promise<ChatEntry[]> {
  const data = await request<Json[]>(endpoints.chatList);
  if (!Array.isArray(data)) return [];
  return data.map((d) => ({
    conversation: {
      roomId: Number(d.room_id),
      otherUserId: String(d.user_id),
      lastMessage: d.last_message ?? undefined,
      lastActivity: d.last_message_time ? toIso(d.last_message_time) : undefined,
      unread: Number(d.unread_count ?? 0),
    },
    user: toUserProfile(d),
  }));
}

/**
 * Converts a message from the REST history ({ id, sender_id, content,
 * timestamp, is_read }) or the WebSocket ({ message, sender_id, timestamp })
 * into a Message. Our own messages get senderId "me".
 */
export function toMessage(d: Json, roomId: number, myId: string | null): Message {
  const sender = String(d.sender_id ?? d.sender ?? "");
  const createdAt = toIso(d.timestamp ?? d.created_at);
  return {
    id: d.id != null ? String(d.id) : `ws_${sender}_${createdAt}`,
    conversationId: String(roomId),
    senderId: myId && sender === myId ? "me" : sender,
    text: String(d.content ?? d.message ?? ""),
    createdAt,
    read: typeof d.is_read === "boolean" ? d.is_read : undefined,
  };
}

export async function getMessages(roomId: number, myId: string | null): Promise<Message[]> {
  const data = await request<Json[]>(endpoints.chatMessages(roomId));
  return Array.isArray(data) ? data.map((d) => toMessage(d, roomId, myId)) : [];
}

/** Sends a message over HTTP, for when the chat socket isn't available (web). */
export async function sendMessage(roomId: number, text: string): Promise<Json> {
  return request<Json>(endpoints.chatMessages(roomId), { body: { message: text } });
}

export async function markRead(roomId: number): Promise<void> {
  await request(endpoints.chatRead(roomId), { method: "POST" });
}
