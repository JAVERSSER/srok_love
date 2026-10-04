import { Platform } from "react-native";
import { API_BASE_URL, API_ORIGIN, endpoints } from "@/constants/api";
import { storage, KEYS } from "@/services/storage";
import type { Conversation, Gender, Match, Message, UserProfile } from "@/models";

// HTTP client for the Django backend.
//
// The backend authenticates with the `access_token` / `refresh_token` cookies
// it sets on login, so every request is sent with cookies
// (`credentials: "include"`). If it ever returns tokens in the JSON body too,
// we also send an `Authorization: Bearer` header.

const TIMEOUT_MS = 20000;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface Tokens {
  access: string | null;
  refresh: string | null;
}

let tokens: Tokens = { access: null, refresh: null };
let tokensLoaded = false;
let refreshing: Promise<boolean> | null = null;
let onSessionExpired: (() => void) | null = null;

/** Called when the refresh token is rejected and the user must log in again. */
export function setOnSessionExpired(fn: () => void) {
  onSessionExpired = fn;
}

async function loadTokens() {
  if (tokensLoaded) return;
  tokens = (await storage.get<Tokens>(KEYS.tokens)) ?? { access: null, refresh: null };
  tokensLoaded = true;
}

async function saveTokens(next: Tokens) {
  tokens = next;
  tokensLoaded = true;
  await storage.set(KEYS.tokens, next);
}

export async function clearTokens() {
  await saveTokens({ access: null, refresh: null });
}

// --- response helpers -------------------------------------------------------

type Json = Record<string, any>;

// Accepts the common shapes: { access, refresh }, { access_token, ... },
// { tokens: {...} } and { data: {...} }.
function extractTokens(data: Json | null): Partial<Tokens> {
  if (!data || typeof data !== "object") return {};
  const src: Json = data.tokens ?? data.data?.tokens ?? data.data ?? data;
  const access = src.access ?? src.access_token ?? data.access ?? data.access_token;
  const refresh = src.refresh ?? src.refresh_token ?? data.refresh ?? data.refresh_token;
  return {
    ...(typeof access === "string" ? { access } : {}),
    ...(typeof refresh === "string" ? { refresh } : {}),
  };
}

// Turns DRF error bodies ({ detail }, { non_field_errors: [] },
// { field: ["msg"] }) into one readable sentence.
function errorMessage(data: unknown, status: number): string {
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
  await loadTokens();
  const headers: Record<string, string> = { Accept: "application/json" };
  // For FormData, fetch sets the multipart boundary itself.
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth !== false && tokens.access) headers.Authorization = `Bearer ${tokens.access}`;

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
  let res = await send(path, opts);

  if (res.status === 401 && opts.auth !== false) {
    if (await refreshAccessToken()) {
      res = await send(path, opts);
    } else {
      await clearTokens();
      onSessionExpired?.();
    }
  }

  const data = await parseBody(res);
  if (!res.ok) throw new ApiError(errorMessage(data, res.status), res.status, data);
  return data as T;
}

/** Exchanges the refresh token for a new access token. Concurrent callers share one request. */
export function refreshAccessToken(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        await loadTokens();
        // Without a stored refresh token, the server can still read the cookie.
        const res = await send(endpoints.refresh, {
          body: tokens.refresh ? { refresh: tokens.refresh } : {},
          auth: false,
        });
        if (!res.ok) return false;
        const next = extractTokens((await parseBody(res)) as Json);
        await saveTokens({
          access: next.access ?? tokens.access,
          refresh: next.refresh ?? tokens.refresh,
        });
        return true;
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

// --- auth -------------------------------------------------------------------

export interface AuthUser {
  id: string | null;
  username: string;
}

function decodeJwtUserId(token: string | null): string | null {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=")));
    return json.user_id != null ? String(json.user_id) : null;
  } catch {
    return null;
  }
}

async function startSession(data: Json, fallbackUsername: string): Promise<AuthUser> {
  const t = extractTokens(data);
  await saveTokens({ access: t.access ?? null, refresh: t.refresh ?? null });
  const user: Json = data?.user ?? data?.data?.user ?? {};
  return {
    id: user.id != null ? String(user.id) : decodeJwtUserId(t.access ?? null),
    username: user.username ?? fallbackUsername,
  };
}

const deviceName = `SrokLove ${Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "Android" : "Web"}`;

/** `login` may be a username or email, as the backend accepts either. */
export async function login(loginId: string, password: string): Promise<AuthUser> {
  const data = await request<Json>(endpoints.login, {
    body: { login: loginId.trim(), password, device_name: deviceName },
    auth: false,
  });
  return startSession(data, loginId.trim());
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
  // Only filled in when the server sends them.
  bio?: string;
  location?: string;
  occupation?: string;
  education?: string;
  relationshipGoal?: string;
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
    bio: text(d.bio),
    location: text(d.province) ?? text(d.location),
    occupation: text(d.occupation),
    education: text(d.education),
    relationshipGoal: text(d.relationship_goal),
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
  const form = new FormData();
  if (Platform.OS === "web") {
    // On web the picker gives a blob:/data: URI; FormData needs the Blob itself.
    const blob = await (await fetch(image.uri)).blob();
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

/** Sets which uploaded photos are on the profile, in display order. */
export async function assignPhotos(photoIds: number[]): Promise<void> {
  await request(endpoints.assignPhotos, {
    body: { photos: photoIds.map((id, order) => ({ id, order })) },
  });
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

/** People near the user's last reported location (includes people already swiped). */
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

export async function markRead(roomId: number): Promise<void> {
  await request(endpoints.chatRead(roomId), { method: "POST" });
}
