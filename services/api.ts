import { Platform } from "react-native";
import { API_BASE_URL, API_ORIGIN, endpoints } from "@/constants/api";
import { storage, KEYS } from "@/services/storage";

// HTTP client for the Django backend.
//
// The backend sets `access_token` / `refresh_token` cookies on login, and may
// also return the tokens in the JSON body. We support both: every request is
// sent with cookies (`credentials: "include"`) and, when we have an access
// token from the body, an `Authorization: Bearer` header too.

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
  password: string;
  /** YYYY-MM-DD */
  dateOfBirth: string;
}

export async function register({ username, email, password, dateOfBirth }: RegisterInput): Promise<AuthUser> {
  await request(endpoints.register, {
    body: { username: username.trim(), email: email.trim(), password, date_of_birth: dateOfBirth.trim() },
    auth: false,
  });
  // Log in right away so we get a session whether or not register returns one.
  return login(username, password);
}

// --- photos -----------------------------------------------------------------

export interface RemotePhoto {
  id: number;
  url: string;
  order?: number;
}

/** Makes media URLs from the API loadable by the app (absolute, and proxied on web). */
export function resolveMediaUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith(API_ORIGIN)) return API_BASE_URL + url.slice(API_ORIGIN.length);
  if (url.startsWith("/")) return API_BASE_URL + url;
  return url;
}

function toPhoto(data: Json): RemotePhoto {
  const raw = data.image ?? data.image_url ?? data.url ?? data.file ?? data.photo ?? "";
  return { id: Number(data.id), url: resolveMediaUrl(String(raw)), order: data.order };
}

export interface LocalImage {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}

export async function uploadPhoto(image: LocalImage): Promise<RemotePhoto> {
  const type = image.mimeType ?? "image/jpeg";
  const name = image.fileName ?? `photo.${type.split("/")[1] ?? "jpg"}`;
  const form = new FormData();
  if (Platform.OS === "web") {
    // On web the picker gives a blob:/data: URI; FormData needs the Blob itself.
    const blob = await (await fetch(image.uri)).blob();
    form.append("image", blob, name);
  } else {
    form.append("image", { uri: image.uri, name, type } as unknown as Blob);
  }
  const data = await request<Json>(endpoints.photos, { form, method: "POST" });
  return toPhoto(data?.data ?? data);
}

/** Sets which uploaded photos are on the profile, in display order. */
export async function assignPhotos(photoIds: number[]): Promise<void> {
  await request(endpoints.assignPhotos, {
    body: { photos: photoIds.map((id, order) => ({ id, order })) },
  });
}
